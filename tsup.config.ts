import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  minify: true,
  sourcemap: false,
  target: 'node20',
  splitting: false,
  treeshake: true,
});