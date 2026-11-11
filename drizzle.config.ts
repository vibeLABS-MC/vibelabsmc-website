import { defineConfig } from 'drizzle-kit';

// `bun run db:generate` writes a new SQL migration into drizzle/ from changes to the schema.
export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	casing: 'snake_case'
});
