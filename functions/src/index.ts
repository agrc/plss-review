import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeUserSignedIn, HttpsError, type AuthBlockingEvent } from 'firebase-functions/identity';
import { logger } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';

const cors = [/ut-dts-agrc-plss-dev-staff-review\.web\.app$/, /localhost:\d+$/];

const health = onRequest({ cors, region: 'us-west3' }, async (_, res) => {
  res.send('healthy');
});

// Only export health check in emulator mode
export const healthCheck = process.env.FUNCTIONS_EMULATOR === 'true' ? health : undefined;

initializeApp();

const db = getFirestore();

async function authorizeUser(event: AuthBlockingEvent) {
  const email = event.data?.email;
  logger.debug('authorizeUser', { email });

  if (!email) {
    throw new HttpsError('invalid-argument', 'Email is required');
  }

  const ref = db.collection('authorized-users').doc(email.trim().toLowerCase());
  const doc = await ref.get();

  if (!doc.exists) {
    throw new HttpsError('permission-denied', `The email, ${email}, is not authorized to access this resource.`);
  }
}

// The PLSS submission app already has a blocking function to create profiles.
// export const beforeCreated = beforeUserCreated(authorizeUser);

/* This may not be necessary since beforeUserCreated fires before beforeUserSignedIn. Leaving it here in case it's needed for existing users.
 This also would be a good place to add additional checks for existing users.
 */
export const beforeSignedIn = beforeUserSignedIn(authorizeUser);
