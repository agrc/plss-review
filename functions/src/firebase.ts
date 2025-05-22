import { initializeApp } from 'firebase-admin/app';
import { type FirebaseOptions } from 'firebase/app';

export const safelyInitializeApp = () => {
  let app = {} as FirebaseOptions;
  try {
    app = JSON.parse(process.env.FIREBASE_CONFIG ?? '{}');
  } catch (error) {
    console.error('This happens in unit tests', error);
  }

  if (['development', 'test'].includes(process.env.NODE_ENV ?? '')) {
    app.storageBucket = 'localhost';
    app.projectId = 'ut-dts-agrc-plss-dev';
  }

  try {
    initializeApp(app);
  } catch {
    /* empty */
  }

  return app;
};

/**
 * Get the URL of a given v2 cloud function.
 *
 * @param {string} name the function's name
 * @param {string} location the function's location
 * @return {Promise<string>} The URL of the function
 */
export function getFunctionUrl(name: string, location = 'us-central1') {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    return undefined;
  }
  const projectId = process.env.FIREBASE_CONFIG
    ? JSON.parse(process.env.FIREBASE_CONFIG).projectId
    : process.env.PROJECT_ID;

  // gen2 cloud run url format
  return `https://${location}-${projectId}.cloudfunctions.net/${name}`;
}
