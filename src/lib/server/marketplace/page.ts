/** Loading a project for its public page, with the checks that decide who may see it. */
import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { isStaff } from '../auth/access.ts';
import { isFollowing, userCollections, userReview } from '../community/community.ts';
import { listCategories, listGameVersions } from './catalog.ts';
import { listGallery } from './gallery.ts';
import { canView, getProjectBySlug, listMembers, memberRole } from './projects.ts';
import { listVersions } from './releases.ts';
import { parseSetup, SETUP_COOKIE } from '../../marketplace/setup.ts';
import { typeFromPath } from '../../marketplace/taxonomy.ts';

export async function loadProjectPage(
	locals: App.Locals,
	params: { type: string; slug: string },
	cookies: Cookies
) {
	const info = typeFromPath(params.type);
	if (!info) error(404, 'Not found');
	const project = await getProjectBySlug(locals.db, info.id, params.slug);
	if (!project) error(404, 'Not found');
	const user = locals.user;
	const role = await memberRole(locals.db, project.id, user?.id);
	if (!canView(project, role, user?.role ?? null)) error(404, 'Not found');
	const staff = !!user && isStaff(user.role);

	const [members, gallery, versions, following, collections, categories, known, review] =
		await Promise.all([
			listMembers(locals.db, project.id),
			listGallery(locals.db, project.id),
			listVersions(locals.db, project.id, !!role || staff),
			isFollowing(locals.db, user?.id, project.id),
			user ? userCollections(locals.db, user.id, { projectId: project.id }) : Promise.resolve([]),
			listCategories(locals.db, info.id, true),
			listGameVersions(locals.db),
			userReview(locals.db, project.id, user?.id)
		]);
	const { search: _search, ...publicProject } = project;
	return {
		info,
		project: publicProject,
		role,
		staff,
		members,
		gallery,
		versions: versions.map((v) => ({
			...v,
			files: v.files.map((f) => ({
				id: f.id,
				filename: f.filename,
				size: f.size,
				sha1: f.sha1,
				sha512: f.sha512,
				primary: f.primary,
				scanStatus: f.scanStatus
			}))
		})),
		following,
		collections: collections.map((c) => ({
			id: c.collection.id,
			name: c.collection.name,
			contains: c.contains,
			visibility: c.collection.visibility
		})),
		categoryNames: Object.fromEntries(categories.map((c) => [c.slug, c.name])) as Record<
			string,
			string
		>,
		knownVersions: known.map((v) => v.version),
		setup: parseSetup(cookies.get(SETUP_COOKIE)),
		hasReviewed: !!review,
		signedIn: !!user
	};
}
