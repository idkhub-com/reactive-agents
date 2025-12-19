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
  sourcemap: true,
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log('Build complete');
