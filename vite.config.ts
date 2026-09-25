import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths: the build works under GitHub Pages' /continuum/ and under `npm run preview` alike.
  base: './',
  server: { port: 5173 },
  test: {
    css: true,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
