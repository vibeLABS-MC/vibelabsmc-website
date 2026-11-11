/** The signed-in person as pages see them: only what the UI needs, never secrets. */
import type { Session, User } from './session.ts';
import type { Role, Viewer } from './access.ts';

export interface SessionUser {
	id: string;
	username: string | null;
	displayName: string;
	avatarKey: string | null;
	role: Role;
	email: string | null;
	emailVerified: boolean;
	hasPassword: boolean;
	totpEnabled: boolean;
}

export function toSessionUser(user: User): SessionUser {
	return {
		id: user.id,
		username: user.username,
		displayName: user.displayName,
		avatarKey: user.avatarKey,
		role: user.role,
		email: user.email,
		emailVerified: !!user.emailVerifiedAt,
		hasPassword: !!user.passwordHash,
		totpEnabled: !!user.totpEnabledAt
	};
}

export function toViewer(user: SessionUser | null, session: Session | null): Viewer | null {
	if (!user || !session) return null;
	return {
		role: user.role,
		onboarded: !!user.username,
		totpEnabled: user.totpEnabled,
		twoFactorVerified: session.twoFactorVerified || !user.totpEnabled
	};
}
