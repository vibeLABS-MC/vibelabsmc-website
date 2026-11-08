import { recentlyUpdated } from '#lib/docs/catalog.ts';
import { pipelineHtml } from '#lib/docs/pipeline.ts';
import { summary } from '#lib/docs/summary.ts';
import { catalog, render, renderPage } from '#lib/server/content.ts';
import type { DocPage } from '#lib/docs/page.ts';
import type { SectionId } from '#lib/docs/sections.ts';

/** The lesson on the home page: a whole composite pass that adds a vignette. */
const LESSON = `\`\`\`glsl title="shaders/composite.fsh" {11-12}
#version 330 compatibility

uniform sampler2D colortex0;
in vec2 texcoord;

/* RENDERTARGETS: 0 */
layout(location = 0) out vec4 color;

void main() {
    color = texture(colortex0, texcoord);
    float d = distance(texcoord, vec2(0.5));
    color.rgb *= 1.0 - smoothstep(0.3, 0.8, d);
}
\`\`\``;

const pagesIn = (id: SectionId) => catalog.nav.find((s) => s.id === id)?.pages ?? [];

const withMinutes = async (page: DocPage) => ({
	...summary(page),
	minutes: (await renderPage(page)).minutes
});

export const load = async () => ({
	play: await Promise.all(pagesIn('using').slice(0, 4).map(withMinutes)),
	make: await Promise.all(pagesIn('developing').slice(0, 4).map(withMinutes)),
	reference: [...pagesIn('reference'), ...pagesIn('standards')]
		.filter((p) => p.tag)
		.slice(0, 6)
		.map(summary),
	recent: recentlyUpdated(catalog, 4).map(summary),
	pipeline: pipelineHtml([
		'shadow',
		'prepare',
		'gbuffers-opaque',
		'deferred',
		'composite',
		'final'
	]),
	lesson: (await render(LESSON, 'src/routes/+page.server.ts')).html
});
