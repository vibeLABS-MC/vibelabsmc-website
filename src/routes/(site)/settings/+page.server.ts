import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { usernameProblem } from '#lib/server/auth/username.ts';
import { setUsername } from '#lib/server/auth/users.ts';
import { users } from '#lib/server/db/schema.ts';
import { field, file, limitAction } from '#lib/server/http.ts';
import { ImageError, storeImage } from '#lib/server/media/images.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals, url);
	const [row] = await locals.db.select({ bio: users.bio }).from(users).where(eq(users.id, user.id));
	return {
		profile: {
			username: user.username,
			displayName: user.displayName,
			bio: row?.bio ?? '',
			avatarKey: user.avatarKey
		}
	};
};

export const actions: Actions = {
	profile: async ({ request, locals, url }) => {
		const { user } = requireUser(locals, url);
		const limited = limitAction(locals, 'write', user.id);
		if (limited) return fail(429, { section: 'profile', message: limited.data.message });
		const data = await request.formData();
		const displayName = field(data, 'displayName');
		const bio = field(data, 'bio');
		const username = field(data, 'username');
		if (!displayName || displayName.length > 64)
			return fail(400, {
				section: 'profile',
				message: 'Use a display name of 1 to 64 characters.'
			});
		if (bio.length > 500)
			return fail(400, { section: 'profile', message: 'Keep your bio under 500 characters.' });

		if (username !== user.username) {
			const problem = usernameProblem(username);
			if (problem) return fail(400, { section: 'profile', message: problem });
			if (!(await setUsername(locals.db, user.id, username)))
				return fail(400, { section: 'profile', message: 'That username is taken.' });
			await audit(locals.db, {
				actorId: user.id,
				action: 'account.username_changed',
				targetType: 'user',
				targetId: user.id,
				details: { from: user.username, to: username },
				ipHash: locals.ipHash
			});
		}
		await locals.db
			.update(users)
			.set({ displayName, bio, updatedAt: new Date() })
			.where(eq(users.id, user.id));
		return { section: 'profile', saved: true };
	},

	avatar: async ({ request, locals, url }) => {
		const { user } = requireUser(locals, url);
		const limited = limitAction(locals, 'upload', user.id);
		if (limited) return fail(429, { section: 'avatar', message: limited.data.message });
		const upload = file(await request.formData(), 'avatar');
		if (!upload) return fail(400, { section: 'avatar', message: 'Choose an image.' });
		try {
			const stored = await storeImage(
				locals.config.storageDir,
				Buffer.from(await upload.arrayBuffer()),
				'avatar'
			);
			await locals.db
				.update(users)
				.set({ avatarKey: stored.key, updatedAt: new Date() })
				.where(eq(users.id, user.id));
			return { section: 'avatar', saved: true };
		} catch (cause) {
			if (cause instanceof ImageError)
				return fail(400, { section: 'avatar', message: cause.message });
			throw cause;
		}
	},

	removeAvatar: async ({ locals, url }) => {
		const { user } = requireUser(locals, url);
		await locals.db
			.update(users)
			.set({ avatarKey: null, updatedAt: new Date() })
			.where(eq(users.id, user.id));
		return { section: 'avatar', saved: true };
	}
};
