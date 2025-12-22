import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.tsx'],
    include: ['packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
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
    server: {
      deps: {
        inline: ['@tanstack/react-router'],
      },
    },
    alias: {
      '@': path.resolve(__dirname),
      '@web': path.resolve(__dirname, 'packages/web/src'),
      '@api': path.resolve(__dirname, 'packages/api/src'),
      '@shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
});
