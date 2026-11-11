/** Shared pieces of the staff form actions. */
import { fail } from '@sveltejs/kit';
import { audit } from '../audit.ts';
import { requireStaff } from '../auth/guards.ts';
import { decide, type Decision } from './moderation.ts';

const DECISIONS: Decision[] = ['approve', 'reject', 'changes', 'withhold', 'restore'];
const RESULT = {
	'needs-message': 'Write a message: the team needs to know why.',
	'not-allowed': 'That decision doesn’t fit the project’s current state.',
	missing: 'The project no longer exists.'
} as const;

/** One moderation decision from a form: checks, applies, notifies (in `decide`) and audits. */
export async function moderate(locals: App.Locals, data: FormData) {
	const { user } = requireStaff(locals);
	const projectId = String(data.get('project') ?? '');
	const decision = String(data.get('decision') ?? '') as Decision;
	const message = String(data.get('message') ?? '')
		.trim()
		.slice(0, 2000);
	if (!DECISIONS.includes(decision)) return fail(400, { message: 'Unknown decision.' });
	const result = await decide(locals.db, projectId, decision, message);
	if (result !== 'done') return fail(400, { message: RESULT[result] });
	await audit(locals.db, {
		actorId: user.id,
		action: `moderation.${decision}`,
		targetType: 'project',
		targetId: projectId,
		details: message ? { message } : {},
		ipHash: locals.ipHash
	});
	return { decided: decision };
}
