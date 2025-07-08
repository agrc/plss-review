/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import loadVersion from 'vite-plugin-package-version';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), loadVersion()],
  resolve: {
    // this is only applicable when pnpm-linking the utah-design-package
    dedupe: ['firebase', '@arcgis/core'],
  },
  test: {
    environment: 'node',
    globals: true,
    env: {
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
      GCLOUD_PROJECT: 'test-project',
    },
  },
});
