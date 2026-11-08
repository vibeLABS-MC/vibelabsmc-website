import { BookOpen, CodeXml, Gamepad2, Layers } from '@lucide/svelte';
import type { SectionId } from '#lib/docs/sections.ts';

/** The icon that stands for each docs section, wherever sections appear. */
export const SECTION_ICONS = {
	using: Gamepad2,
	developing: CodeXml,
	reference: BookOpen,
	standards: Layers
} satisfies Record<SectionId, unknown>;
