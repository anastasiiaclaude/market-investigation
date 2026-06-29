import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Root is the repo root so specs for both the frontend (`app/src`) and the
// serverless backend (`api/`, a sibling of `app/`) are discovered.
export default defineConfig({
  test: {
    environment: 'node',
    root: path.resolve(__dirname, '..'),
    include: ['app/src/**/*.spec.{ts,tsx}', 'api/**/*.spec.ts'],
  },
});
