/** Reading and checking the "new version" and "edit version" forms. */
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { projects } from '../db/schema.ts';
import {
	isLoaderFor,
	typeInfo,
	type Loader,
	type ProjectType
} from '../../marketplace/taxonomy.ts';
import { validGameVersions } from './catalog.ts';
import { field, fields } from '../http.ts';

export const CHANNELS = ['release', 'beta', 'alpha'] as const;
export type Channel = (typeof CHANNELS)[number];
export const DEPENDENCY_KINDS = ['required', 'optional', 'incompatible', 'embedded'] as const;
type Kind = (typeof DEPENDENCY_KINDS)[number];

export function versionNumberProblem(value: string): string | null {
	if (!value || value.length > 32) return 'Use a version number of 1 to 32 characters.';
	if (!/^[\w.+-]+$/.test(value))
		return 'Use letters, numbers, dots, dashes, + and _ in the version number.';
	return null;
}

export interface VersionFields {
	name: string;
	changelog: string;
	channel: Channel;
	gameVersions: string[];
	loaders: Loader[];
}

export async function readVersionFields(
	db: Database,
	type: ProjectType,
	data: FormData,
	fallbackName: string
): Promise<VersionFields | { problem: string }> {
	const channel = field(data, 'channel') as Channel;
	if (!CHANNELS.includes(channel)) return { problem: 'Choose release, beta or alpha.' };
	const name = (field(data, 'name') || fallbackName).slice(0, 64);
	const changelog = field(data, 'changelog');
	if (changelog.length > 20_000) return { problem: 'Keep the changelog under 20,000 characters.' };
	const gameVersions = await validGameVersions(db, fields(data, 'gameVersions'));
	if (!gameVersions.length) return { problem: 'Choose at least one Minecraft version.' };
	const loaders = fields(data, 'loaders').filter((l): l is Loader => isLoaderFor(type, l));
	if (typeInfo(type).loaders.length && !loaders.length)
		return { problem: 'Choose at least one loader.' };
	return { name, changelog, channel, gameVersions, loaders };
}

/** `projectId:kind` pairs from the form, kept only for approved projects. */
export async function readDependencies(
	db: Database,
	data: FormData
): Promise<{ projectId: string; kind: Kind }[]> {
	const pairs = fields(data, 'dependency')
		.map((value) => value.split(':'))
		.filter(
			(p): p is [string, Kind] =>
				p.length === 2 && (DEPENDENCY_KINDS as readonly string[]).includes(p[1]!)
		);
	if (!pairs.length) return [];
	const known = await db
		.select({ id: projects.id })
		.from(projects)
		.where(
			and(
				inArray(
					projects.id,
					pairs.map((p) => p[0])
				),
				eq(projects.status, 'approved')
			)
		);
	const ids = new Set(known.map((k) => k.id));
	return pairs
		.filter(([id]) => ids.has(id))
		.slice(0, 30)
		.map(([projectId, kind]) => ({ projectId, kind }));
}
