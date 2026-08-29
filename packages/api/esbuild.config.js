import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** The bundle both `build.js` and `dev.js` produce and run. */
export const outfile = path.join(__dirname, 'dist/server.js');

/**
 * esbuild options for the Node build of the API.
 *
 * Shared so that the development server runs the same bundle the image ships
 * rather than a second configuration that can drift from it -- the `external`
 * entry below in particular is not something a dev build can safely omit.
 */
export const buildOptions = {
  entryPoints: [path.join(__dirname, 'src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile,
  alias: {
    '@server': path.join(__dirname, 'src'),
    '@shared': path.join(__dirname, '../shared/src'),
  },
  /**
   * `libsql` loads a platform-specific native addon with a runtime `require`,
   * which cannot be bundled. Leaving it external means Node resolves it from
   * node_modules instead, so the runtime image has to carry it -- see the
   * runner stage of the root Dockerfile.
   *
   * Only the local-file path needs it. A deployment using remote libSQL, or
   * Supabase, never loads it.
   */
  external: ['libsql'],
  sourcemap: true,
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
};
