import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// A Node server (run by Bun on the VPS) behind nginx: accounts and uploads need one.
			adapter: adapter({ precompress: true }),
			// Server-rendered pages get a fresh nonce per response in the CSP header; anything
			// prerendered gets hashes in a <meta> tag. Cloudflare/nginx add no CSP of their own,
			// except `frame-ancestors`, which a <meta> tag cannot express.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'https://static.cloudflareinsights.com'],
					// SvelteKit's route announcer sets one inline style; allow exactly that one.
					// tests/site/csp.test.ts fails if a SvelteKit update changes it.
					'style-src': [
						'self',
						'unsafe-hashes',
						'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='
					],
					// blob: shows a picked image before it is uploaded. Every other image (avatars,
					// icons, gallery) is re-encoded and served from this origin.
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self'],
					'connect-src': ['self', 'https://cloudflareinsights.com'],
					'frame-ancestors': ['none'],
					'base-uri': ['none'],
					'form-action': ['self'],
					'object-src': ['none'],
					'upgrade-insecure-requests': true
				}
			}
		})
	],
	// Fonts and images stay separate files: the CSP only allows fonts from this origin.
	build: { assetsInlineLimit: 0 },
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.test.ts'],
			reporter: ['text-summary', 'lcov']
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.ts'],
					// Each database test file starts its own in-memory Postgres; give a busy machine time.
					hookTimeout: 60_000,
					testTimeout: 30_000
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'site',
					environment: 'node',
					include: ['tests/site/**/*.test.ts'],
					globalSetup: ['tests/site/server.ts'],
					// One server and one database for the whole run, so files share it in order.
					fileParallelism: false,
					testTimeout: 30_000,
					hookTimeout: 120_000
				}
			}
		]
	}
});
