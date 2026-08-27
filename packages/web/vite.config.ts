import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['lodash'],
  },
  build: {
    // TipTap rich text editor is ~515KB - this is expected for a full-featured editor
    chunkSizeWarningLimit: 520,
    rollupOptions: {
      output: {
        manualChunks: {
          // Monaco editor is very large, keep it separate
          monaco: ['monaco-editor', '@monaco-editor/react'],
          // Chart.js and related
          charts: ['chart.js', 'react-chartjs-2', 'chartjs-plugin-annotation'],
          // TipTap rich text editor
          tiptap: [
            '@tiptap/core',
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-horizontal-rule',
            '@tiptap/extension-task-item',
            '@tiptap/extension-task-list',
            '@tiptap/extension-text-align',
            '@tiptap/extension-text-style',
            'tiptap-markdown',
          ],
          // Radix UI components
          radix: [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-icons',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          // Animation libraries
          animation: ['framer-motion'],
          // React core
          react: ['react', 'react-dom'],
          // TanStack libraries
          tanstack: ['@tanstack/react-query', '@tanstack/react-router'],
          // Markdown and content rendering
          markdown: ['react-markdown'],
          // Date utilities
          dates: ['date-fns', 'date-fns-tz', 'react-day-picker'],
          // Form libraries
          forms: ['react-hook-form', '@hookform/resolvers'],
          // Icon library
          icons: ['lucide-react'],
          // DiceBear avatars
          dicebear: ['@dicebear/core', '@dicebear/collection'],
          // Command menu
          cmdk: ['cmdk'],
          // Schema validation
          zod: ['zod'],
          // Utilities
          utils: ['clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
  },
  plugins: [
    tsConfigPaths({
      root: '../..',
      projects: [
        './packages/web/tsconfig.json',
        './packages/shared/tsconfig.json',
        './packages/api/tsconfig.json',
      ],
    }),
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      routeFileIgnorePattern: '__tests__',
    }),
    viteReact(),
  ],
});
