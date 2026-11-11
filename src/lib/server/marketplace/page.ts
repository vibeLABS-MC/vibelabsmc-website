/** Loading a project for its public page, with the checks that decide who may see it. */
import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { isStaff } from '../auth/access.ts';
import type { SessionUser } from '../auth/viewer.ts';
import { isFollowing, userCollections, userReview } from '../community/community.ts';
import type { Database } from '../db/index.ts';
import { listCategories, listGameVersions } from './catalog.ts';
import { listGallery } from './gallery.ts';
import { canView, getProjectBySlug, listMembers, memberRole, type Project } from './projects.ts';
import { listVersions, type VersionWithFiles } from './releases.ts';
import { parseSetup, SETUP_COOKIE } from '../../marketplace/setup.ts';
import { typeFromPath } from '../../marketplace/taxonomy.ts';

/** The project and the viewer's place in it, or a 404 for anyone who may not see it. */
async function visibleProject(locals: App.Locals, params: { type: string; slug: string }) {
	const info = typeFromPath(params.type);
	const project = info ? await getProjectBySlug(locals.db, info.id, params.slug) : null;
	if (!info || !project) error(404, 'Not found');
	const user = locals.user;
	const role = await memberRole(locals.db, project.id, user?.id);
	if (!canView(project, role, user?.role ?? null)) error(404, 'Not found');
	return { info, project, role, staff: !!user && isStaff(user.role) };
}

/** What only a signed-in viewer has: following, their collections, their review. */
async function viewerState(db: Database, user: SessionUser | null, projectId: string) {
	if (!user) return { following: false, collections: [], hasReviewed: false };
	const [following, collections, review] = await Promise.all([
		isFollowing(db, user.id, projectId),
		userCollections(db, user.id, { projectId }),
		userReview(db, projectId, user.id)
	]);
	return {
		following,
		collections: collections.map((c) => ({
			id: c.collection.id,
			name: c.collection.name,
			contains: c.contains,
			visibility: c.collection.visibility
		})),
		hasReviewed: !!review
	};
}

/** Versions as the page needs them: files without storage details. */
const pageVersions = (list: VersionWithFiles[]) =>
	list.map((v) => ({
		...v,
		files: v.files.map(({ id, filename, size, sha1, sha512, primary, scanStatus }) => ({
			id,
			filename,
			size,
			sha1,
			sha512,
			primary,
			scanStatus
		}))
	}));

const withoutSearch = ({ search: _search, ...rest }: Project) => rest;

export async function loadProjectPage(
	locals: App.Locals,
	params: { type: string; slug: string },
	cookies: Cookies
) {
	const { info, project, role, staff } = await visibleProject(locals, params);
	const [members, gallery, versions, categories, known, viewer] = await Promise.all([
		listMembers(locals.db, project.id),
		listGallery(locals.db, project.id),
		listVersions(locals.db, project.id, !!role || staff),
		listCategories(locals.db, info.id, true),
		listGameVersions(locals.db),
		viewerState(locals.db, locals.user, project.id)
	]);
	return {
		info,
		project: withoutSearch(project),
		role,
		staff,
		members,
		gallery,
		versions: pageVersions(versions),
		...viewer,
		categoryNames: Object.fromEntries(categories.map((c) => [c.slug, c.name])) as Record<
			string,
			string
		>,
		knownVersions: known.map((v) => v.version),
		setup: parseSetup(cookies.get(SETUP_COOKIE)),
		signedIn: !!locals.user
	};
}
