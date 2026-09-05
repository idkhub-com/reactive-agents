import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type ProxyOptions } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { readApiPort, waitForApiPort } from '../../scripts/dev-api-port.mjs';

/** Stands in for the API's address until the first request resolves it. */
const PLACEHOLDER_TARGET = 'http://127.0.0.1:1';

/**
 * Says where to send API requests, immediately after Vite's own URL block.
 *
 * It belongs here rather than with the API for two reasons: this is the origin
 * in question, and Vite is the only side that knows which port it actually
 * took -- 3000 may already be in use, in which case it quietly moves to 3001
 * and any address the API printed would be wrong.
 */
const apiEntrypointNotice = (): Plugin => ({
  name: 'super-agents:api-entrypoint-notice',
  apply: 'serve',
  configureServer(server) {
    const printUrls = server.printUrls.bind(server);
    server.printUrls = () => {
      printUrls();
      const address = server.httpServer?.address();
      const port =
        typeof address === 'object' && address !== null
          ? address.port
          : server.config.server.port;
      console.log(
        `  \u001b[32m\u279c\u001b[0m  \u001b[1mAPI\u001b[0m:      send requests here, e.g. http://localhost:${port}/v1/models`,
      );
    };
  },
});

/**
 * The proxy's own options object, captured in `configure` below so that the
 * target can be pointed at the API's runtime port.
 */
let liveProxyOptions: ProxyOptions | undefined;

/**
 * Which third-party packages travel together in a chunk.
 *
 * Vite 8 bundles with Rolldown, whose `output.advancedChunks.groups`
 * replaces Rollup's `manualChunks` map: a group names a chunk and a `test`
 * that decides which module ids land in it. The lists stay the source of
 * truth and `chunkGroups` below turns each into that test, anchored on the
 * `node_modules` path segment so `react` cannot also swallow `react-dom`,
 * `react-markdown` and every other package that merely starts with it.
 */
const chunkedPackages: Record<string, string[]> = {
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
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `@scope/name` has to match a path separator, which differs on Windows. */
const packagePattern = (name: string): string =>
  escapeRegExp(name).replace(/\//g, '[\\\\/]');

const chunkGroups = Object.entries(chunkedPackages).map(([name, packages]) => ({
  name,
  test: new RegExp(
    `node_modules[\\\\/](?:${packages.map(packagePattern).join('|')})[\\\\/]`,
  ),
}));

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/v1': {
        changeOrigin: true,
        /**
         * A placeholder, replaced per request below. The API takes whatever
         * port the operating system has free rather than claiming a fixed one,
         * so there is nothing correct to write here; this value only survives
         * if the API never starts, and then it fails loudly instead of
         * reaching something unrelated.
         */
        target: PLACEHOLDER_TARGET,
        /**
         * `configure` is the only hook handed the options object the proxy
         * actually reads its target from. The one `bypass` receives is a
         * shallow copy Vite makes when it builds its proxy table, so mutating
         * that has no effect -- the request still goes to the placeholder.
         */
        configure: (_proxy, options) => {
          liveProxyOptions = options;
        },
        /**
         * Resolved per request rather than once at startup, so Vite need not
         * wait for the API and an API restarting on a different port is
         * followed rather than proxied into a void.
         */
        bypass: async () => {
          if (!liveProxyOptions) {
            return;
          }
          const port = readApiPort() ?? (await waitForApiPort());
          if (port !== undefined) {
            liveProxyOptions.target = `http://127.0.0.1:${port}`;
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['lodash'],
  },
  build: {
    // TipTap rich text editor is ~515KB - this is expected for a full-featured editor
    chunkSizeWarningLimit: 520,
    /**
     * Never inline a font. `@fontsource` ships a WOFF1 fallback beside every
     * WOFF2, and the small ones fall under the default 4KB limit -- which put
     * 20KB of base64 into the render-blocking stylesheet for a format no
     * browser this app supports has needed since 2016. Emitted as files they
     * are simply never fetched.
     */
    assetsInlineLimit: (filePath: string) =>
      /\.(woff2?|ttf|otf|eot)$/.test(filePath) ? false : undefined,
    rolldownOptions: {
      output: {
        advancedChunks: { groups: chunkGroups },
      },
    },
  },
  plugins: [
    apiEntrypointNotice(),
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
