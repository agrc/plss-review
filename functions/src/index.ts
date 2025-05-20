import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { beforeUserSignedIn, HttpsError, type AuthBlockingEvent } from 'firebase-functions/identity';
import { defineSecret } from 'firebase-functions/params';
import { onTaskDispatched } from 'firebase-functions/tasks';
import { logger } from 'firebase-functions/v2';
import {
  Change,
  onDocumentUpdated,
  type FirestoreEvent,
  type QueryDocumentSnapshot,
} from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { DateTime } from 'luxon';
import { getBase64EncodedAttachment, getContactsToNotify, notify } from './emailHelper.js';
import { safelyInitializeApp } from './firebase.js';

type ResponseError = {
  code: number;
  cause?: unknown;
  message: string;
  response: {
    headers: { [key: string]: string };
    body: string;
  };
};

const cors = [/ut-dts-agrc-plss-dev-staff-review\.web\.app$/, /localhost:\d+$/];
const sendGridApiKey = defineSecret('SENDGRID_API_KEY');

const health = onRequest({ cors, region: 'us-west3' }, async (_, res) => {
  res.send('healthy');
});

// Only export health check in emulator mode
export const healthCheck = process.env.FUNCTIONS_EMULATOR === 'true' ? health : undefined;

safelyInitializeApp();

const db = getFirestore();
const bucket = getStorage().bucket();

function getMountainTimeFutureDate(daysInFuture: number): string {
  return DateTime.now().setZone('America/Denver').plus({ days: daysInFuture }).toFormat('yyyy/MM/dd');
}

async function authorizeUser(event: AuthBlockingEvent) {
  const id = event.data?.uid;
  const tenant = event.data?.tenantId;

  if (tenant !== 'plss-review-keo70') {
    return;
  }

  logger.debug('authorizeUser', { id, tenant });

  if (!id) {
    throw new HttpsError('invalid-argument', 'E01: An account is required');
  }

  const ref = db.collection('submitters').doc(id.trim());
  const doc = await ref.get();

  if (!doc.exists) {
    logger.debug('authorize failure', { id, reason: 'doc does not exist' });

    throw new HttpsError(
      'permission-denied',
      `E02: The email, ${event.data?.email}, is not authorized to access this resource.`,
    );
  }

  const data = doc.data();

  if (!data?.elevated) {
    logger.debug('authorize failure', { id, data, reason: 'elevated is false' });

    throw new HttpsError(
      'permission-denied',
      `E03: The email, ${event.data?.email}, is not authorized to access this resource.`,
    );
  }
}

async function countyNotification(
  event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { docId: string }>,
): Promise<boolean> {
  if (event === undefined) {
    logger.warn('[database::submissions::onUpdate] submission update event is undefined');

    return false;
  }

  const after = event.data?.after.data();

  if (!after) {
    logger.debug('[database::submissions::onUpdate] after data is undefined. Document was deleted?');

    return false;
  }

  // if ugrc approved has not been approved we're in received
  if (after.status.ugrc.approved === null) {
    logger.debug('[database::submissions::onUpdate] requires ugrc approval', after, { structuredData: true });

    return false;
  }

  // if county approved is not null we're past county review
  if (after.status.county.approved !== null) {
    logger.debug('[database::submissions::onUpdate] county review already complete', after, { structuredData: true });

    return false;
  }

  const contacts = await getContactsToNotify(db, after.county);

  if (contacts.length === 0) {
    logger.debug('[database::submissions::onUpdate] no contacts to notify', after.county, { structuredData: true });

    return false;
  }

  const content = await getBase64EncodedAttachment(bucket.file(after.monument).createReadStream());
  const templateData = {
    blmPointId: after.blm_point_id,
    surveyor: after.submitted_by.name,
    day: getMountainTimeFutureDate(10),
  };

  const template = {
    method: 'POST' as const,
    url: '/v3/mail/send',
    body: {
      template_id: 'd-a1dd2b8a4ae84c909ca2bc218af724de',
      from: {
        email: 'ugrc-plss-administrators@utah.gov',
        name: 'UGRC PLSS Administrators',
      },
      personalizations: [
        {
          to: contacts,
          dynamic_template_data: templateData,
        },
      ],
      attachments: [
        { content, filename: `${after.blm_point_id}-review.pdf`, type: 'application/pdf', disposition: 'attachment' },
      ],
    },
  };

  logger.debug('[database::submissions::onUpdate] sending notification email to', contacts, templateData, {
    structuredData: true,
  });

  try {
    const result = await notify(process.env.SENDGRID_API_KEY ?? 'empty', template);

    logger.debug('[database::submissions::onUpdate] mail sent with status', result[0].statusCode, {
      structuredData: true,
    });
  } catch (error) {
    console.error(error);

    if (error && typeof error === 'object' && 'response' in error) {
      const { message, response } = error as ResponseError;
      const { headers, body } = response;

      logger.error('[database::submissions::onUpdate] mail failed', message, response, body, headers, {
        structuredData: true,
      });
    } else {
      logger.error('[database::submissions::onUpdate] mail failed', error, {
        structuredData: true,
      });
    }
  }

  return true;
}

export const beforeSignedIn = beforeUserSignedIn(authorizeUser);
export const notifyCounty = onDocumentUpdated(
  { document: 'submissions/{docId}', secrets: [sendGridApiKey] },
  countyNotification,
);
export const autoApprove = onTaskDispatched({
  retryConfig: {
    maxAttempts: 3,
    maxRetryDuration: 60,
  },
});
