/** Access to the project editor in the dashboard: only the project's own team. */
import { error, redirect } from '@sveltejs/kit';
import { getProject, memberRole, type MemberRole, type Project } from './projects.ts';
import type { SessionUser } from '../auth/viewer.ts';

export async function editableProject(
	locals: App.Locals,
	id: string,
	needed: MemberRole = 'maintainer'
): Promise<{ project: Project; role: MemberRole; user: SessionUser }> {
	const user = locals.user;
	if (!user) redirect(303, '/login');
	const project = await getProject(locals.db, id);
	const role = project ? await memberRole(locals.db, project.id, user.id) : null;
	if (!project || !role) error(404, 'Not found');
	if (needed === 'owner' && role !== 'owner') error(403, 'Only the owner can do that.');
	return { project, role, user };
}

/** Projects under review can't be edited until they are withdrawn (so moderators see what they approve). */
export function lockedForReview(project: Project): boolean {
	return project.status === 'in_review';
}

/** Links must be real web addresses; anything else (javascript:, data:) is refused. */
export function linkProblem(value: string): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:'
			? null
			: 'Links must start with https://';
	} catch {
		return 'That isn’t a valid link.';
	}
}
