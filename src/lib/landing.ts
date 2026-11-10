/**
 * The landing page's words and links. Every link into the docs goes through
 * docsUrl(), which rejects malformed paths. Keep claims in step with the docs.
 */
import { docsUrl } from './site.ts';

export interface PathStep {
	title: string;
	text: string;
	href: string;
}

export interface Path {
	id: string;
	label: string;
	intro: string;
	steps: PathStep[];
}

export const PATHS: Path[] = [
	{
		id: 'play',
		label: 'I play with shaders',
		intro: 'Get a shaderpack running on Iris or OptiFine, then keep your frame rate up.',
		steps: [
			{
				title: 'Install a shader loader',
				text: 'Iris and Sodium on Fabric or NeoForge, or OptiFine on its own or with Forge.',
				href: docsUrl('/using/install-iris/')
			},
			{
				title: 'Choose a shaderpack',
				text: 'Judge a pack by its style, performance cost and version support, and download it safely.',
				href: docsUrl('/using/choosing-a-shaderpack/')
			},
			{
				title: 'Tune your frame rate',
				text: 'Start with shadows, then render distance and render scale, and make sure the right GPU does the work.',
				href: docsUrl('/using/performance/')
			}
		]
	},
	{
		id: 'make',
		label: 'I write shaders',
		intro: 'Learn how a shaderpack works, then build your own from an empty folder.',
		steps: [
			{
				title: 'Get set up',
				text: 'What to learn, what to install and where the official references live.',
				href: docsUrl('/developing/getting-started/')
			},
			{
				title: 'Write your first pack',
				text: 'A pass-through final program, then a greyscale and vignette effect you can see in game.',
				href: docsUrl('/developing/first-shaderpack/')
			},
			{
				title: 'Understand the frame',
				text: 'Which of your programs run when, and how data moves from one pass to the next.',
				href: docsUrl('/developing/rendering-pipeline/')
			}
		]
	}
];

export interface Pass {
	program: string;
	title: string;
	kind: 'geometry' | 'fullscreen';
}

/** One frame, simplified: the passes the rendering-pipeline guide walks through. */
export const FRAME: Pass[] = [
	{ program: 'shadow', title: 'Shadow map', kind: 'geometry' },
	{ program: 'gbuffers', title: 'Opaque world', kind: 'geometry' },
	{ program: 'deferred', title: 'Lighting', kind: 'fullscreen' },
	{ program: 'gbuffers', title: 'Water and glass', kind: 'geometry' },
	{ program: 'composite', title: 'Fog and bloom', kind: 'fullscreen' },
	{ program: 'final', title: 'To screen', kind: 'fullscreen' }
];

export interface Question {
	id: string;
	question: string;
	answer: string;
	link?: { label: string; href: string };
}

export const FAQ: Question[] = [
	{
		id: 'what',
		question: 'What is a shaderpack?',
		answer:
			'A folder of small GLSL programs that change how Minecraft: Java Edition draws the world: its lighting, shadows, water, sky and more. A shader loader, Iris or OptiFine, runs them.',
		link: { label: 'How a frame is drawn', href: docsUrl('/developing/rendering-pipeline/') }
	},
	{
		id: 'loader',
		question: 'Should I use Iris or OptiFine?',
		answer:
			'For many players either works. Most shaderpacks are written for OptiFine’s shader format, and Iris loads that format too, with a few gaps.',
		link: {
			label: 'When one is clearly better',
			href: docsUrl('/using/install-optifine/#optifine-or-iris')
		}
	},
	{
		id: 'bedrock',
		question: 'Do shaderpacks work on Bedrock Edition?',
		answer:
			'No. Iris and OptiFine are Java Edition mods, and Bedrock Edition cannot load them. Phone apps that claim to add shaders to Bedrock without the game’s own graphics features are scams.',
		link: { label: 'Choosing a shaderpack', href: docsUrl('/using/choosing-a-shaderpack/') }
	},
	{
		id: 'fps',
		question: 'Will shaders lower my frame rate?',
		answer:
			'Usually, because a shaderpack does far more work every frame. How much depends on the pack and its settings, and shadows are the first thing to lower.',
		link: { label: 'Performance guide', href: docsUrl('/using/performance/') }
	},
	{
		id: 'free',
		question: 'Is it free, and can I help?',
		answer:
			'Yes to both. The docs are free to read and written in the open on GitHub. Corrections, clearer wording and new pages are all welcome.'
	}
];
