import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    './src/index.ts',
  ],
  outDir: 'dist',
  format: ['iife', 'esm'],
  globalName: 'fabric',
  sourcemap: true,
})
