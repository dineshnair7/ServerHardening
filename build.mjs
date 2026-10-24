import { copyFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('dist', { recursive: true });
await Promise.all([
  copyFile('index.html', 'dist/index.html'),
  copyFile('hardening-change-planner.html', 'dist/hardening-change-planner.html')
]);
await build({
  entryPoints: ['src/cloud.js'],
  outfile: 'dist/cloud.js',
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020']
});
