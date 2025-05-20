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
