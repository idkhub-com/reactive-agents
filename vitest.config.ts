import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      // in-depth tests excluded based on environment variable
      ...(process.env.INCLUDE_IN_DEPTH !== 'true' ? ['**/in-depth/**'] : []),
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    deps: {
      inline: ['lodash'],
    },
    alias: {
      '@': path.resolve(__dirname),
      '@client': path.resolve(__dirname, 'lib/client'),
      '@server': path.resolve(__dirname, 'lib/server'),
      '@shared': path.resolve(__dirname, 'lib/shared'),
    },
  },
});
