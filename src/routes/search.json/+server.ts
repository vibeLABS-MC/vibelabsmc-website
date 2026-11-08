import { json } from '@sveltejs/kit';
import { searchEntries } from '#lib/server/content.ts';

export const prerender = true;

export const GET = async () => json(await searchEntries());
