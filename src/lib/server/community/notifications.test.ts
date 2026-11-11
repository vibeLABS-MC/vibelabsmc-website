import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import { listNotifications, markRead, notify, unreadCount } from './notifications.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

describe('notifications', () => {
	it('sends one notification per person, newest first, and counts the unread ones', async () => {
		const a = await makeUser(db);
		const b = await makeUser(db);

		await notify(db, [a.id, b.id, a.id], 'version_published', { project: 'p1' });
		await notify(db, [a.id], 'review_reply', { review: 'r1' });
		await notify(db, [], 'review_reply', {});

		expect(await unreadCount(db, a.id)).toBe(2);
		expect(await unreadCount(db, b.id)).toBe(1);
		const list = await listNotifications(db, a.id);
		expect(list.map((n) => n.kind)).toEqual(['review_reply', 'version_published']);
		expect(list[1]!.data).toEqual({ project: 'p1' });
	});

	it('pages backwards from an ID', async () => {
		const user = await makeUser(db);
		for (let i = 0; i < 5; i++) await notify(db, [user.id], 'version_published', { i });

		const first = await listNotifications(db, user.id, { limit: 2 });
		const next = await listNotifications(db, user.id, { limit: 2, before: first[1]!.id });
		expect(first.map((n) => n.data.i)).toEqual([4, 3]);
		expect(next.map((n) => n.data.i)).toEqual([2, 1]);
	});

	it('marks chosen notifications, or all of them, as read, only for their owner', async () => {
		const owner = await makeUser(db);
		const other = await makeUser(db);
		await notify(db, [owner.id, other.id], 'team_invite', {});
		await notify(db, [owner.id], 'team_invite', {});
		const [newest] = await listNotifications(db, owner.id, { limit: 1 });
		const othersOwn = await listNotifications(db, other.id);

		await markRead(db, owner.id, [newest!.id, othersOwn[0]!.id]);
		expect(await unreadCount(db, owner.id)).toBe(1);
		expect(await unreadCount(db, other.id)).toBe(1);

		await markRead(db, owner.id, []);
		expect(await unreadCount(db, owner.id)).toBe(1);
		await markRead(db, owner.id);
		expect(await unreadCount(db, owner.id)).toBe(0);
	});
});
