import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '404.html' }),
			// Every page is prerendered, so SvelteKit writes this policy into a <meta> tag and adds
			// hashes for the inline scripts it generates. Cloudflare adds the remaining headers.
			csp: {
				mode: 'hash',
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
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self', 'https://cloudflareinsights.com'],
					'base-uri': ['none'],
					'form-action': ['none'],
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
				test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] }
			},
			{
				extends: './vite.config.ts',
				test: { name: 'site', environment: 'node', include: ['tests/site/**/*.test.ts'] }
			}
		]
	}
});
