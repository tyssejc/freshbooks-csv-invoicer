import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
    alias: {
      '@': '/Users/ctysse/Code/projects/freshbooks-csv-invoicer/src',
    },
  },
});
