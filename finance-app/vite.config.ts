import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    // Live mode: the Express proxy in /server talks to Yahoo Finance.
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**', 'server/**', 'shared/**'],
      exclude: [
        '**/*.test.*',
        'src/test/**',
        'src/main.tsx', // browser bootstrap only
        '**/*.css',
        'shared/MarketDataProvider.ts', // interface only, no runtime code
      ],
      reporter: ['text', 'html'],
      // Set just under the current numbers so coverage cannot silently regress.
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
