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
					'style-src': ['self'],
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
