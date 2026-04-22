import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  bundle: true,
  // Bundle ALL dependencies into the output file. A GitHub Action has no
  // node_modules at runtime — the runner just executes dist/index.js directly.
  // Without this, tsup would leave @actions/core and micromatch as external
  // requires and the action would fail at runtime.
  noExternal: [/.*/],
  minify: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  shims: false,
  // Keep the output as a single index.js file, not index.cjs
  outExtension: () => ({ js: '.js' }),
});
