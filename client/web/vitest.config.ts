import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['node_modules', 'e2e/**'],
    setupFiles: [path.resolve(__dirname, 'src/__tests__/setup.ts')],
    globals: true,
  },
});
