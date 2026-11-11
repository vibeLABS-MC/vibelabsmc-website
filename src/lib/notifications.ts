/** Turning stored notifications into a sentence and a link. Browser-safe and tested. */
import { projectPath, isProjectType } from './marketplace/taxonomy.ts';

export interface NotificationView {
	text: string;
	detail: string | null;
	href: string | null;
	tone: 'ok' | 'warn' | 'error' | 'info';
}

type Data = Record<string, unknown>;
const s = (value: unknown) => (typeof value === 'string' ? value : '');

function projectHref(data: Data, suffix = ''): string | null {
	const type = s(data.projectType);
	return isProjectType(type) && s(data.slug) ? projectPath(type, s(data.slug)) + suffix : null;
}

type Describe = (data: Data, name: string, message: string | null) => NotificationView;
const view = (
	text: string,
	href: string | null,
	tone: NotificationView['tone'],
	detail: string | null = null
): NotificationView => ({
	text,
	detail,
	href,
	tone
});
const dashboard = (data: Data, suffix = '') => `/dashboard/projects/${s(data.projectId)}${suffix}`;

const KINDS: Record<string, Describe> = {
	version_published: (d, name) =>
		view(
			`${name} released ${s(d.versionNumber)}`,
			projectHref(d, `/version/${s(d.versionId)}`),
			'info'
		),
	project_approved: (d, name) => view(`${name} is approved and public`, projectHref(d), 'ok'),
	project_rejected: (d, name, message) =>
		view(`${name} was not approved`, dashboard(d), 'error', message),
	project_changes_requested: (d, name, message) =>
		view(`Moderators asked for changes to ${name}`, dashboard(d), 'warn', message),
	project_withheld: (d, name, message) =>
		view(`${name} was withheld by moderators`, dashboard(d), 'error', message),
	review_reply: (d, name) =>
		view(`The team of ${name} replied to your review`, projectHref(d, '/reviews'), 'info'),
	team_invite: (d, name) =>
		view(`${s(d.from) || 'Someone'} invited you to the team of ${name}`, '/dashboard', 'info'),
	report_resolved: (_d, _name, message) =>
		view('A report you made was handled', null, 'ok', message),
	file_flagged: (d, name, message) =>
		view(`A file in ${name} was flagged`, dashboard(d, '/versions'), 'error', message)
};

export function describeNotification(kind: string, data: Data): NotificationView {
	const describe = KINDS[kind];
	const message = s(data.message) || null;
	return describe
		? describe(data, s(data.projectName) || 'a project', message)
		: view('Notification', null, 'info', message);
}
