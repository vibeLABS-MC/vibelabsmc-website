/**
 * The audit log: an append-only record of security events and every staff action. Nothing
 * in the app updates or deletes these rows.
 */
import type { Database } from './db/index.ts';
import { auditLog } from './db/schema.ts';

export interface AuditEntry {
	actorId: string | null;
	action: string;
	targetType?: string;
	targetId?: string;
	details?: Record<string, unknown>;
	ipHash?: string;
}

export async function audit(db: Database, entry: AuditEntry): Promise<void> {
	await db.insert(auditLog).values({
		actorId: entry.actorId,
		action: entry.action,
		targetType: entry.targetType ?? null,
		targetId: entry.targetId ?? null,
		details: entry.details ?? {},
		ipHash: entry.ipHash ?? null
	});
}
