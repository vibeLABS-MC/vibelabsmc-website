/** A project's screenshots: add, caption, feature (the card banner), reorder, remove. */
import { and, asc, eq, max, ne } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { gallery } from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import type { StoredImage } from '../media/images.ts';

export type GalleryImage = typeof gallery.$inferSelect;
export const GALLERY_MAX = 32;

export async function listGallery(db: Database, projectId: string): Promise<GalleryImage[]> {
	return db
		.select()
		.from(gallery)
		.where(eq(gallery.projectId, projectId))
		.orderBy(asc(gallery.sortOrder), asc(gallery.createdAt));
}

export async function addImage(
	db: Database,
	projectId: string,
	image: StoredImage,
	title = ''
): Promise<GalleryImage | null> {
	const existing = await listGallery(db, projectId);
	if (existing.length >= GALLERY_MAX) return null;
	const [{ top } = { top: 0 }] = await db
		.select({ top: max(gallery.sortOrder) })
		.from(gallery)
		.where(eq(gallery.projectId, projectId));
	const [row] = await db
		.insert(gallery)
		.values({
			id: newId(),
			projectId,
			imageKey: image.key,
			width: image.width,
			height: image.height,
			title: title.slice(0, 80),
			sortOrder: (top ?? 0) + 1,
			featured: existing.length === 0
		})
		.returning();
	return row!;
}

export async function updateImage(
	db: Database,
	projectId: string,
	id: string,
	values: { title: string; description: string; featured: boolean }
): Promise<void> {
	await db.transaction(async (tx) => {
		if (values.featured)
			await tx
				.update(gallery)
				.set({ featured: false })
				.where(and(eq(gallery.projectId, projectId), ne(gallery.id, id)));
		await tx
			.update(gallery)
			.set({
				title: values.title.slice(0, 80),
				description: values.description.slice(0, 500),
				featured: values.featured
			})
			.where(and(eq(gallery.id, id), eq(gallery.projectId, projectId)));
	});
}

export async function removeImage(db: Database, projectId: string, id: string): Promise<void> {
	await db.delete(gallery).where(and(eq(gallery.id, id), eq(gallery.projectId, projectId)));
}

/** Swaps an image with its neighbour (`-1` earlier, `1` later). */
export async function moveImage(
	db: Database,
	projectId: string,
	id: string,
	direction: -1 | 1
): Promise<void> {
	const list = await listGallery(db, projectId);
	const index = list.findIndex((g) => g.id === id);
	const other = list[index + direction];
	if (index < 0 || !other) return;
	const order = list.map((g) => g.id);
	[order[index], order[index + direction]] = [order[index + direction]!, order[index]!];
	await db.transaction(async (tx) => {
		for (const [i, imageId] of order.entries())
			await tx
				.update(gallery)
				.set({ sortOrder: i + 1 })
				.where(eq(gallery.id, imageId));
	});
}
