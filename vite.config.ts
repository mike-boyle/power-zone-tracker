/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  // Relative base so the build works from any static host path (GitHub Pages
  // serves it from /power-zone-tracker/). Routing is hash-based for the same reason.
  base: './',
  plugins: [solid()],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
