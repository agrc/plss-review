import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { getStorage } from 'firebase-admin/storage';
import { beforeUserSignedIn, HttpsError, type AuthBlockingEvent } from 'firebase-functions/identity';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import {
  Change,
  onDocumentUpdated,
  type FirestoreEvent,
  type QueryDocumentSnapshot,
} from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { DateTime } from 'luxon';
import { getBase64EncodedAttachment, getContactsToNotify, notify } from './emailHelper.js';
import { getFunctionUrl, safelyInitializeApp } from './firebase.js';

type ResponseError = {
  code: number;
  cause?: unknown;
  message: string;
  response: {
    headers: { [key: string]: string };
    body: string;
  };
};

type CountyReview = {
  'status.county.reviewedAt': Date;
  'status.county.reviewedBy': string;
  'status.county.approved'?: boolean;
};

safelyInitializeApp();

const cors = [/ut-dts-agrc-plss-dev-staff-review\.web\.app$/, /localhost:\d+$/];
const sendGridApiKey = defineSecret('SENDGRID_API_KEY');

const db = getFirestore();
const bucket = getStorage().bucket();
const wait = process.env.GCLOUD_PROJECT?.includes('dev') ? { hours: 1 } : { days: 10 };

logger.debug('[tasks queue] duration', wait, {
  structuredData: true,
});

const health = onRequest({ cors, region: 'us-west3' }, async (_, res) => {
  res.send('healthy');
});

// Only export health check in emulator mode
export const healthCheck = process.env.FUNCTIONS_EMULATOR === 'true' ? health : undefined;

function getMountainTimeFutureDate(daysInFuture: number): string {
  return DateTime.now().setZone('America/Denver').plus({ days: daysInFuture }).toFormat('yyyy-MM-dd');
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

// fired when ugrc.status.approved changes
async function countyNotification(
  event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { docId: string }>,
): Promise<boolean> {
  if (event === undefined) {
    logger.warn('[countyNotification] skipping, submission update event is undefined');

    return false;
  }

  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!after || !before) {
    logger.debug(
      '[countyNotification] skipping, after or before data is undefined. Document was deleted or just created?',
    );

    return false;
  }

  // county already notified
  if (after.status.county.notified === true) {
    logger.debug('[countyNotification] skipping, county already notified');

    return false;
  }

  // ugrc status has not changed. no need to notify
  if (before.status.ugrc.approved === after.status.ugrc.approved) {
    logger.debug('[queueDelayedApproval] skipping, ugrc status unchanged');

    return false;
  }

  // ugrc rejected. no need to notify
  if (after.status.ugrc.approved === false) {
    logger.debug('[queueDelayedApproval] skipping, ugrc rejected');

    return false;
  }

  const contacts = await getContactsToNotify(db, after.county);

  if (contacts.length === 0) {
    logger.debug('[countyNotification] no contacts to notify', after.county, {
      structuredData: true,
    });

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

  logger.info('[countyNotification] sending notification email to', contacts, templateData, {
    structuredData: true,
  });

  try {
    const result = await notify(process.env.SENDGRID_API_KEY ?? 'empty', template);

    logger.info('[countyNotification] mail sent with status', result[0].statusCode, {
      structuredData: true,
    });

    event.data?.after.ref.update({
      'status.county.notified': true,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const { message, response } = error as ResponseError;
      const { headers, body } = response;

      logger.error('[countyNotification] mail failed', message, response, body, headers, {
        structuredData: true,
      });
    } else {
      logger.error('[countyNotification] mail failed', error, {
        structuredData: true,
      });
    }
  }

  return true;
}

async function enqueueDelayedApproval(
  event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { docId: string }>,
): Promise<boolean> {
  if (event === undefined) {
    logger.warn('[queueDelayedApproval] skipping, submission update event is undefined');

    return false;
  }

  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!after || !before) {
    logger.debug(
      '[queueDelayedApproval] skipping, after or before data is undefined. Document was deleted or just created?',
    );

    return false;
  }

  // if county approved is not null we're past county review
  if (after.status.county.approved !== null) {
    logger.debug('[queueDelayedApproval] skipping, county review already complete');

    return false;
  }

  const queue = getFunctions().taskQueue('autoApprovals');
  const targetUri = await getFunctionUrl('autoApprovals');
  const scheduleTime = DateTime.now().plus(wait).toJSDate();

  logger.info('[queueDelayedApproval] queuing auto-approval task', `${event.params.docId}-auto-approval-task`, {
    structuredData: true,
  });

  // emulators execute tasks immediately
  try {
    await queue.enqueue(
      { documentId: event.params.docId },
      {
        id: `${event.params.docId}-auto-approval-task`,
        scheduleTime,
        uri: targetUri,
      },
    );
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'errorInfo' in (error as { errorInfo?: { code?: string } }) &&
      (error as { errorInfo: { code: string } }).errorInfo.code === 'functions/task-already-exists'
    ) {
      logger.debug('[queueDelayedApproval] skipping, task already exists');
    } else {
      logger.error('[queueDelayedApproval] failed to enqueue task', error, { structuredData: true });
    }
  }

  return true;
}

async function dequeue(event: { data: { documentId: string } }): Promise<void> {
  const documentId = event.data.documentId;
  const ref = db.collection('submissions').doc(documentId);
  const snap = await ref.get();

  if (!snap.exists) {
    logger.warn(`[dequeue-county-approval] skipping, document does not exist anymore: ${documentId}`);
    return;
  }

  const data = snap.data();
  if (!data) {
    logger.warn(`[dequeue-county-approval] skipping, document data is undefined: ${documentId}`);
    return;
  }

  if (data.status.county.approved !== null) {
    logger.debug('[dequeue-county-approval] skipping, county review already complete', data.status, {
      structuredData: true,
    });

    return;
  }

  const updates = {
    'status.county.reviewedAt': new Date(),
    'status.county.reviewedBy': 'auto-approved',
    'status.county.approved': true,
  } as CountyReview;

  logger.info('[dequeue-county-approval] updating county approval status', data.status, { structuredData: true });

  await ref.update(updates);
}

export const beforeSignedIn = beforeUserSignedIn(authorizeUser);
export const notifyCounty = onDocumentUpdated(
  { document: 'submissions/{docId}', secrets: [sendGridApiKey] },
  countyNotification,
);
export const queueCountyAutoApproval = onDocumentUpdated({ document: 'submissions/{docId}' }, enqueueDelayedApproval);
export const autoApprovals = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 60,
    },
    rateLimits: {
      maxConcurrentDispatches: 6,
    },
  },
  dequeue,
);
