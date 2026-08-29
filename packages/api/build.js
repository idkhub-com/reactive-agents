import * as esbuild from 'esbuild';
import { buildOptions } from './esbuild.config.js';

await esbuild.build(buildOptions);

console.log('Build complete');
