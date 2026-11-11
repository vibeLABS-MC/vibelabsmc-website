/**
 * The whole database, as Drizzle tables. `bun run db:generate` turns changes here into a new
 * SQL migration in `drizzle/`; never edit an applied migration.
 */
import { sql } from 'drizzle-orm';
import {
	bigint,
	bigserial,
	boolean,
	customType,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });
const now = () => timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow();
const at = () => timestamp({ withTimezone: true, mode: 'date' });

// ---------------------------------------------------------------- accounts

export const userRole = pgEnum('user_role', ['user', 'moderator', 'admin']);
export const oauthProvider = pgEnum('oauth_provider', ['github', 'discord']);
export const tokenPurpose = pgEnum('token_purpose', ['verify_email', 'reset_password']);

export const users = pgTable(
	'users',
	{
		id: text().primaryKey(),
		/** Chosen during onboarding; null until then. Unique case-insensitively. */
		username: text(),
		displayName: text().notNull(),
		bio: text().notNull().default(''),
		avatarKey: text(),
		role: userRole().notNull().default('user'),
		email: text(),
		emailVerifiedAt: at(),
		passwordHash: text(),
		/** AES-GCM sealed TOTP secret; see security/crypto.ts. */
		totpSecret: text(),
		totpEnabledAt: at(),
		/** The last 30-second TOTP step accepted, so a code can never be used twice. */
		totpLastStep: bigint({ mode: 'number' }),
		bannedAt: at(),
		banReason: text(),
		createdAt: now(),
		updatedAt: now()
	},
	(t) => [
		uniqueIndex('users_username_lower').on(sql`lower(${t.username})`),
		uniqueIndex('users_email_lower').on(sql`lower(${t.email})`)
	]
);

export const oauthAccounts = pgTable(
	'oauth_accounts',
	{
		provider: oauthProvider().notNull(),
		providerUserId: text().notNull(),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerUsername: text().notNull(),
		createdAt: now()
	},
	(t) => [
		primaryKey({ columns: [t.provider, t.providerUserId] }),
		uniqueIndex('oauth_accounts_user_provider').on(t.userId, t.provider)
	]
);

export const sessions = pgTable(
	'sessions',
	{
		/** SHA-256 of the cookie token; the token itself is never stored. */
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: now(),
		lastSeenAt: now(),
		/** Hard limit: the session ends here however active it is. */
		expiresAt: at().notNull(),
		/** Waiting for the second factor: only /auth/2fa accepts this session. */
		pendingTwoFactor: boolean().notNull().default(false),
		twoFactorVerified: boolean().notNull().default(false),
		/** Sensitive actions are allowed until this time (recent re-authentication). */
		sudoUntil: at(),
		ipHash: text().notNull(),
		userAgent: text().notNull().default('')
	},
	(t) => [index('sessions_user').on(t.userId)]
);

export const emailTokens = pgTable(
	'email_tokens',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		purpose: tokenPurpose().notNull(),
		email: text().notNull(),
		expiresAt: at().notNull(),
		usedAt: at(),
		createdAt: now()
	},
	(t) => [index('email_tokens_user').on(t.userId)]
);

export const recoveryCodes = pgTable(
	'recovery_codes',
	{
		id: bigserial({ mode: 'number' }).primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		codeHash: text().notNull(),
		usedAt: at()
	},
	(t) => [index('recovery_codes_user').on(t.userId)]
);

export const auditLog = pgTable(
	'audit_log',
	{
		id: bigserial({ mode: 'number' }).primaryKey(),
		actorId: text().references(() => users.id, { onDelete: 'set null' }),
		action: text().notNull(),
		targetType: text(),
		targetId: text(),
		details: jsonb().$type<Record<string, unknown>>().notNull().default({}),
		ipHash: text(),
		createdAt: now()
	},
	(t) => [
		index('audit_log_created').on(t.createdAt),
		index('audit_log_target').on(t.targetType, t.targetId),
		index('audit_log_actor').on(t.actorId)
	]
);

// ---------------------------------------------------------------- marketplace

export const projectType = pgEnum('project_type', ['shader', 'resourcepack', 'mod', 'datapack']);
export const projectStatus = pgEnum('project_status', [
	'draft',
	'in_review',
	'approved',
	'rejected',
	'withheld'
]);
export const memberRole = pgEnum('member_role', ['owner', 'maintainer']);
export const versionChannel = pgEnum('version_channel', ['release', 'beta', 'alpha']);
export const versionStatus = pgEnum('version_status', ['listed', 'withheld']);
export const scanStatus = pgEnum('scan_status', [
	'pending',
	'clean',
	'infected',
	'review',
	'error'
]);
export const dependencyKind = pgEnum('dependency_kind', [
	'required',
	'optional',
	'incompatible',
	'embedded'
]);

export const categories = pgTable(
	'categories',
	{
		projectType: projectType().notNull(),
		slug: text().notNull(),
		/** Which filter group it shows under: categories, features, resolution, performance. */
		group: text().notNull(),
		name: text().notNull(),
		sortOrder: integer().notNull().default(0),
		hidden: boolean().notNull().default(false)
	},
	(t) => [primaryKey({ columns: [t.projectType, t.slug] })]
);

export const gameVersions = pgTable('game_versions', {
	version: text().primaryKey(),
	kind: text().notNull(),
	releasedAt: at().notNull()
});

export const projects = pgTable(
	'projects',
	{
		id: text().primaryKey(),
		slug: text().notNull(),
		type: projectType().notNull(),
		name: text().notNull(),
		summary: text().notNull().default(''),
		description: text().notNull().default(''),
		iconKey: text(),
		status: projectStatus().notNull().default('draft'),
		moderationMessage: text(),
		license: text().notNull().default(''),
		licenseUrl: text(),
		sourceUrl: text(),
		issuesUrl: text(),
		wikiUrl: text(),
		discordUrl: text(),
		categories: text()
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		/** Union over listed versions, kept up to date when versions change. */
		gameVersions: text()
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		loaders: text()
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		downloads: bigint({ mode: 'number' }).notNull().default(0),
		follows: integer().notNull().default(0),
		ratingSum: integer().notNull().default(0),
		ratingCount: integer().notNull().default(0),
		createdAt: now(),
		updatedAt: now(),
		submittedAt: at(),
		publishedAt: at(),
		latestVersionAt: at(),
		search: tsvector().generatedAlwaysAs(
			(): ReturnType<typeof sql> =>
				sql`setweight(to_tsvector('simple', coalesce(${projects.name}, '')), 'A') || setweight(to_tsvector('english', coalesce(${projects.summary}, '')), 'B') || setweight(to_tsvector('english', coalesce(${projects.description}, '')), 'D')`
		)
	},
	(t) => [
		uniqueIndex('projects_slug_lower').on(sql`lower(${t.slug})`),
		index('projects_status_type').on(t.status, t.type),
		index('projects_search').using('gin', t.search),
		index('projects_name_trgm').using('gin', sql`lower(${t.name}) gin_trgm_ops`),
		index('projects_categories').using('gin', t.categories),
		index('projects_game_versions').using('gin', t.gameVersions),
		index('projects_loaders').using('gin', t.loaders)
	]
);

export const projectMembers = pgTable(
	'project_members',
	{
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: memberRole().notNull(),
		/** Null while the invitation is waiting for the user to accept. */
		acceptedAt: at(),
		createdAt: now()
	},
	(t) => [primaryKey({ columns: [t.projectId, t.userId] }), index('members_user').on(t.userId)]
);

export const versions = pgTable(
	'versions',
	{
		id: text().primaryKey(),
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		versionNumber: text().notNull(),
		name: text().notNull(),
		changelog: text().notNull().default(''),
		channel: versionChannel().notNull().default('release'),
		gameVersions: text().array().notNull(),
		loaders: text().array().notNull(),
		status: versionStatus().notNull().default('listed'),
		downloads: bigint({ mode: 'number' }).notNull().default(0),
		authorId: text().references(() => users.id, { onDelete: 'set null' }),
		publishedAt: now()
	},
	(t) => [
		index('versions_project').on(t.projectId, t.publishedAt),
		uniqueIndex('versions_project_number').on(t.projectId, t.versionNumber)
	]
);

export const files = pgTable(
	'files',
	{
		id: text().primaryKey(),
		versionId: text()
			.notNull()
			.references(() => versions.id, { onDelete: 'cascade' }),
		filename: text().notNull(),
		size: bigint({ mode: 'number' }).notNull(),
		sha1: text().notNull(),
		sha512: text().notNull(),
		primary: boolean().notNull().default(false),
		scanStatus: scanStatus().notNull().default('pending'),
		scanDetail: text(),
		scannedAt: at(),
		createdAt: now()
	},
	(t) => [
		index('files_version').on(t.versionId),
		index('files_sha1').on(t.sha1),
		index('files_sha512').on(t.sha512)
	]
);

/**
 * Files uploaded (streamed to disk, hashed, checked and scanned) but not yet attached to a
 * version. Creating a version moves them into `files`; leftovers are deleted after a day.
 */
export const stagedFiles = pgTable(
	'staged_files',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		filename: text().notNull(),
		size: bigint({ mode: 'number' }).notNull(),
		sha1: text().notNull(),
		sha512: text().notNull(),
		scanStatus: scanStatus().notNull().default('pending'),
		scanDetail: text(),
		/** What the file itself says: loaders found in a mod, pack format, and so on. */
		detected: jsonb().$type<Record<string, unknown>>().notNull().default({}),
		createdAt: now()
	},
	(t) => [index('staged_files_project').on(t.projectId, t.userId)]
);

export const dependencies = pgTable(
	'dependencies',
	{
		id: bigserial({ mode: 'number' }).primaryKey(),
		versionId: text()
			.notNull()
			.references(() => versions.id, { onDelete: 'cascade' }),
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		kind: dependencyKind().notNull()
	},
	(t) => [uniqueIndex('dependencies_unique').on(t.versionId, t.projectId)]
);

export const gallery = pgTable(
	'gallery',
	{
		id: text().primaryKey(),
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		imageKey: text().notNull(),
		width: integer().notNull(),
		height: integer().notNull(),
		title: text().notNull().default(''),
		description: text().notNull().default(''),
		featured: boolean().notNull().default(false),
		sortOrder: integer().notNull().default(0),
		createdAt: now()
	},
	(t) => [index('gallery_project').on(t.projectId, t.sortOrder)]
);

export const downloadsDaily = pgTable(
	'downloads_daily',
	{
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		day: date({ mode: 'string' }).notNull(),
		count: integer().notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.projectId, t.day] })]
);

// ---------------------------------------------------------------- community

export const reviewStatus = pgEnum('review_status', ['visible', 'hidden']);
export const collectionVisibility = pgEnum('collection_visibility', [
	'public',
	'unlisted',
	'private'
]);
export const reportStatus = pgEnum('report_status', ['open', 'resolved', 'dismissed']);

export const follows = pgTable(
	'follows',
	{
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		createdAt: now()
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.projectId] }),
		index('follows_project').on(t.projectId)
	]
);

export const reviews = pgTable(
	'reviews',
	{
		id: text().primaryKey(),
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		rating: smallint().notNull(),
		body: text().notNull(),
		status: reviewStatus().notNull().default('visible'),
		ownerReply: text(),
		ownerReplyAt: at(),
		createdAt: now(),
		updatedAt: now()
	},
	(t) => [
		uniqueIndex('reviews_one_per_user').on(t.projectId, t.userId),
		index('reviews_project').on(t.projectId, t.createdAt)
	]
);

export const collections = pgTable(
	'collections',
	{
		id: text().primaryKey(),
		ownerId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		description: text().notNull().default(''),
		visibility: collectionVisibility().notNull().default('public'),
		hidden: boolean().notNull().default(false),
		createdAt: now(),
		updatedAt: now()
	},
	(t) => [index('collections_owner').on(t.ownerId)]
);

export const collectionProjects = pgTable(
	'collection_projects',
	{
		collectionId: text()
			.notNull()
			.references(() => collections.id, { onDelete: 'cascade' }),
		projectId: text()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		addedAt: now()
	},
	(t) => [primaryKey({ columns: [t.collectionId, t.projectId] })]
);

export const notifications = pgTable(
	'notifications',
	{
		id: bigserial({ mode: 'number' }).primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text().notNull(),
		data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
		readAt: at(),
		createdAt: now()
	},
	(t) => [index('notifications_user').on(t.userId, t.createdAt)]
);

export const reports = pgTable(
	'reports',
	{
		id: text().primaryKey(),
		reporterId: text().references(() => users.id, { onDelete: 'set null' }),
		targetType: text().notNull(),
		targetId: text().notNull(),
		reason: text().notNull(),
		body: text().notNull().default(''),
		status: reportStatus().notNull().default('open'),
		resolvedBy: text().references(() => users.id, { onDelete: 'set null' }),
		resolution: text(),
		createdAt: now(),
		resolvedAt: at()
	},
	(t) => [index('reports_status').on(t.status, t.createdAt)]
);
