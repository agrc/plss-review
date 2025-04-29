import * as admin from 'firebase-admin';

export function initializeFirebase(args: string[] = []): { db: admin.firestore.Firestore; auth: admin.auth.Auth } {
  let projectId = 'ut-dts-agrc-plss-dev';

  const projectArg = args.find((arg) => arg.startsWith('--project='));
  if (projectArg) {
    projectId = projectArg.split('=')[1];
  }

  console.log(`Initializing Firebase with project ID: ${projectId}`);

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: projectId,
  });

  return { db: admin.firestore(), auth: admin.auth() };
}
