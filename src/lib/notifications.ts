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

export function describeNotification(kind: string, data: Data): NotificationView {
	const name = s(data.projectName) || 'a project';
	const message = s(data.message) || null;
	switch (kind) {
		case 'version_published':
			return {
				text: `${name} released ${s(data.versionNumber)}`,
				detail: null,
				href: projectHref(data, `/version/${s(data.versionId)}`),
				tone: 'info'
			};
		case 'project_approved':
			return {
				text: `${name} is approved and public`,
				detail: null,
				href: projectHref(data),
				tone: 'ok'
			};
		case 'project_rejected':
			return {
				text: `${name} was not approved`,
				detail: message,
				href: `/dashboard/projects/${s(data.projectId)}`,
				tone: 'error'
			};
		case 'project_changes_requested':
			return {
				text: `Moderators asked for changes to ${name}`,
				detail: message,
				href: `/dashboard/projects/${s(data.projectId)}`,
				tone: 'warn'
			};
		case 'project_withheld':
			return {
				text: `${name} was withheld by moderators`,
				detail: message,
				href: `/dashboard/projects/${s(data.projectId)}`,
				tone: 'error'
			};
		case 'review_reply':
			return {
				text: `The team of ${name} replied to your review`,
				detail: null,
				href: projectHref(data, '/reviews'),
				tone: 'info'
			};
		case 'team_invite':
			return {
				text: `${s(data.from) || 'Someone'} invited you to the team of ${name}`,
				detail: null,
				href: '/dashboard',
				tone: 'info'
			};
		case 'report_resolved':
			return { text: 'A report you made was handled', detail: message, href: null, tone: 'ok' };
		case 'file_flagged':
			return {
				text: `A file in ${name} was flagged`,
				detail: message,
				href: `/dashboard/projects/${s(data.projectId)}/versions`,
				tone: 'error'
			};
		default:
			return { text: 'Notification', detail: message, href: null, tone: 'info' };
	}
}
