import { ContentError } from './page';

export type PassKind = 'geometry' | 'fullscreen';

interface Pass {
	program: string;
	kind: PassKind;
	title: string;
	caption: string;
}

/** The passes of one Iris/OptiFine frame. Names here are what ```pipeline blocks may list. */
export const PASSES = {
	shadow: {
		program: 'shadow',
		kind: 'geometry',
		title: 'Shadow map',
		caption: 'The world from the sun'
	},
	shadowcomp: {
		program: 'shadowcomp',
		kind: 'fullscreen',
		title: 'Shadow post',
		caption: 'Filters the shadow map'
	},
	prepare: {
		program: 'prepare',
		kind: 'fullscreen',
		title: 'Prepare',
		caption: 'Before the world draws'
	},
	'gbuffers-opaque': {
		program: 'gbuffers',
		kind: 'geometry',
		title: 'Opaque geometry',
		caption: 'Blocks, entities, sky'
	},
	deferred: {
		program: 'deferred',
		kind: 'fullscreen',
		title: 'Lighting',
		caption: 'Lights the opaque scene'
	},
	'gbuffers-translucent': {
		program: 'gbuffers',
		kind: 'geometry',
		title: 'Translucent geometry',
		caption: 'Water and glass'
	},
	composite: {
		program: 'composite',
		kind: 'fullscreen',
		title: 'Post-processing',
		caption: 'Fog, bloom, depth of field'
	},
	final: {
		program: 'final',
		kind: 'fullscreen',
		title: 'To screen',
		caption: 'Tone map and output'
	}
} as const satisfies Record<string, Pass>;

export type PassId = keyof typeof PASSES;

const isPass = (name: string): name is PassId => Object.hasOwn(PASSES, name);

/** Reads a ```pipeline block: one pass name per line. */
export function parsePipeline(spec: string): PassId[] {
	return spec
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((name) => {
			if (!isPass(name)) {
				throw new ContentError(`unknown pass "${name}"; use ${Object.keys(PASSES).join(', ')}`);
			}
			return name;
		});
}

export function pipelineHtml(ids: PassId[]): string {
	const steps = ids
		.map((id) => {
			const pass = PASSES[id];
			return (
				`<li class="pass"><code class="pass-node ${pass.kind}">${pass.program}</code>` +
				`<span class="pass-title">${pass.title}</span><span class="pass-caption">${pass.caption}</span></li>`
			);
		})
		.join('');
	return (
		`<figure class="pipeline"><ol class="pass-list">${steps}</ol>` +
		'<figcaption class="pass-legend"><span class="legend geometry">Geometry pass: draws the world</span>' +
		'<span class="legend fullscreen">Fullscreen pass: runs once per pixel</span></figcaption></figure>'
	);
}
