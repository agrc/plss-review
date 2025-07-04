import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      FIRESTORE_EMULATOR_HOST: 'localhost:8080',
      FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
      FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
      GCLOUD_PROJECT: 'test-project',
    },
  },
});
