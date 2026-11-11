import { describe, expect, it } from 'vitest';
import { describeNotification } from './notifications.ts';

const project = { projectId: 'p1', projectName: 'Glow', projectType: 'shader', slug: 'glow' };

describe('describeNotification', () => {
	it('links new versions to the version page', () => {
		expect(
			describeNotification('version_published', {
				...project,
				versionId: 'v9',
				versionNumber: '2.0'
			})
		).toEqual({
			text: 'Glow released 2.0',
			detail: null,
			href: '/marketplace/shaders/glow/version/v9',
			tone: 'info'
		});
	});

	it('passes on moderator messages and links to the dashboard', () => {
		expect(
			describeNotification('project_changes_requested', { ...project, message: 'Add screenshots.' })
		).toMatchObject({
			detail: 'Add screenshots.',
			href: '/dashboard/projects/p1',
			tone: 'warn'
		});
		expect(describeNotification('project_rejected', project).tone).toBe('error');
		expect(describeNotification('project_withheld', project).text).toBe(
			'Glow was withheld by moderators'
		);
		expect(describeNotification('project_approved', project).href).toBe(
			'/marketplace/shaders/glow'
		);
	});

	it('covers replies, invitations, reports and flagged files', () => {
		expect(describeNotification('review_reply', project).href).toBe(
			'/marketplace/shaders/glow/reviews'
		);
		expect(describeNotification('team_invite', { ...project, from: 'sora' }).text).toBe(
			'sora invited you to the team of Glow'
		);
		expect(describeNotification('team_invite', project).text).toBe(
			'Someone invited you to the team of Glow'
		);
		expect(describeNotification('report_resolved', { message: 'Removed.' })).toMatchObject({
			href: null,
			detail: 'Removed.'
		});
		expect(describeNotification('file_flagged', project).href).toBe(
			'/dashboard/projects/p1/versions'
		);
	});

	it('copes with missing or odd data', () => {
		expect(describeNotification('project_approved', { projectType: 'plugin' }).href).toBeNull();
		expect(describeNotification('project_approved', {}).text).toBe(
			'a project is approved and public'
		);
		expect(describeNotification('something_new', {})).toEqual({
			text: 'Notification',
			detail: null,
			href: null,
			tone: 'info'
		});
	});
});
