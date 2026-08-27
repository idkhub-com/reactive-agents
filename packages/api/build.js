import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: path.join(__dirname, 'dist/server.js'),
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
});

console.log('Build complete');
