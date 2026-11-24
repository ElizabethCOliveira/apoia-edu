import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Cada arquivo de teste recebe um banco SQLite temporário e isolado (veja tests/setup.ts).
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
  },
});
