import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, type AuthBlockingEvent } from 'firebase-functions/identity';
import { logger } from 'firebase-functions/v2';
import { Change, type FirestoreEvent, type QueryDocumentSnapshot } from 'firebase-functions/v2/firestore';
import { DateTime } from 'luxon';
import { calculateFeatureUpdates, getAGOLToken, getAttributesFor, mergeUpdates, updateFeatureService } from './agol.js';
import { getBase64EncodedAttachment, getContactsToNotify, notify } from './emailHelper.js';
import { getFunctionUrl, safelyInitializeApp } from './firebase.js';
import { getSubmissionsReadyForPublishing } from './queries.js';
import { generateSheetName, moveSheetsToFinalLocation } from './storage.js';
import type {
  AGOLAttributes,
  BucketFileMigration,
  CountyReview,
  EmailEvent,
  PublishingMetadata,
  SubmissionInCountyEvent,
  SubmissionRejectedEvent,
} from './types.js';
import { determineStatusChange, getFiscalYear, getMountainTimeFutureDate } from './utils.js';

safelyInitializeApp();

const wait =
  process.env.FUNCTIONS_EMULATOR === 'true'
    ? { minutes: 1 }
    : process.env.GCLOUD_PROJECT?.includes('dev')
      ? { hours: 1 }
      : { days: 10 };

const db = getFirestore();
const bucket = getStorage().bucket();

export async function authorizeUser(event: AuthBlockingEvent) {
  const id = event.data?.uid;
  const tenant = event.data?.tenantId;

  if (tenant !== 'plss-review-keo70' && tenant !== 'plss-review-maptv') {
    return;
  }

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

export async function queueTasks(
  event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { docId: string }>,
): Promise<boolean> {
  if (event === undefined) {
    logger.warn('[queueTasks] skipping, submission update event is undefined');

    return false;
  }

  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!after || !before) {
    logger.debug('[queueTasks] skipping, after or before data is undefined. Document was deleted or just created?');

    return false;
  }

  const statusChange = determineStatusChange(before.status, after.status);

  if (!statusChange) {
    logger.debug('[queueTasks] skipping, status change is undefined', {
      before: before.status,
      after: after.status,
    });

    return false;
  }

  const approvalQueue = getFunctions().taskQueue('autoApprovals');
  const emailQueue = getFunctions().taskQueue('email');

  const snap = await (after.submitted_by.ref as DocumentReference).get();
  let surveyor = { email: 'noreply@utah.gov', name: 'unknown' };

  if (snap.exists) {
    const data = snap.data();

    if (data) {
      surveyor = {
        name: data?.displayName,
        email: data?.email,
      };
    }
  }

  switch (statusChange.status) {
    case 'UGRC Review': {
      // ugrc approval, notify county it's their turn to review and set up auto approval
      if (statusChange.approved) {
        logger.debug('creating ugrc approval queue tasks', statusChange);

        // auto approval task
        try {
          await approvalQueue.enqueue(
            {
              documentId: event.params.docId,
            },
            {
              id: `submission-auto-approval-${event.params.docId}`,
              scheduleTime: DateTime.now().plus(wait).toJSDate(),
              uri: getFunctionUrl('autoApprovals'),
            },
          );
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'errorInfo' in (error as { errorInfo?: { code?: string } }) &&
            (error as { errorInfo: { code: string } }).errorInfo.code === 'functions/task-already-exists'
          ) {
            logger.debug('skipping, task already exists', {
              task: `submission-auto-approval-${event.params.docId}`,
              document: event.params.docId,
              type: 'auto-approve',
            });
          } else {
            logger.error('failed to enqueue task', {
              error,
              task: `submission-auto-approval-${event.params.docId}`,
              document: event.params.docId,
              type: 'auto-approve',
            });
          }
        }

        // email task
        try {
          await emailQueue.enqueue(
            {
              type: 'submission-in-county',
              payload: {
                submissionId: event.params.docId,
                monumentBucketPath: `under-review/${after.blm_point_id}/${after.submitted_by.id}/${event.params.docId}.pdf`,
                blmPointId: after.blm_point_id,
                county: after.county,
                surveyor,
              },
            } satisfies SubmissionInCountyEvent,
            {
              id: `submission-in-county-${event.params.docId}`,
              scheduleDelaySeconds: 0, // execute immediately
              uri: getFunctionUrl('email'),
            },
          );
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'errorInfo' in (error as { errorInfo?: { code?: string } }) &&
            (error as { errorInfo: { code: string } }).errorInfo.code === 'functions/task-already-exists'
          ) {
            logger.debug('skipping, task already exists', {
              task: `submission-in-county-${event.params.docId}`,
              document: event.params.docId,
              type: 'email',
            });
          } else {
            logger.error('failed to enqueue task', {
              error,
              task: `submission-in-county-${event.params.docId}`,
              type: 'email',
              document: event.params.docId,
            });
          }
        }
      } else {
        logger.debug('creating ugrc rejection queue task', statusChange);

        // ugrc rejection send email
        try {
          await emailQueue.enqueue(
            {
              type: 'submission-rejected',
              payload: {
                submissionId: event.params.docId,
                blmPointId: after.blm_point_id,
                county: after.county,
                surveyor,
              },
            } satisfies SubmissionRejectedEvent,
            {
              id: `ugrc-rejection-${event.params.docId}`,
              scheduleDelaySeconds: 0, // execute immediately
              uri: getFunctionUrl('email'),
            },
          );
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'errorInfo' in (error as { errorInfo?: { code?: string } }) &&
            (error as { errorInfo: { code: string } }).errorInfo.code === 'functions/task-already-exists'
          ) {
            logger.debug('skipping, task already exists', {
              task: `ugrc-rejection`,
              type: 'email',
              document: event.params.docId,
            });
          } else {
            logger.error('failed to enqueue task', {
              error,
              task: `ugrc-rejection`,
              type: 'email',
              document: event.params.docId,
            });
          }
        }
      }

      break;
    }
    case 'County Review': {
      if (!statusChange.approved) {
        logger.debug('creating county rejection queue task', statusChange);

        // county rejection send email
        try {
          await emailQueue.enqueue(
            {
              type: 'submission-rejected',
              payload: {
                submissionId: event.params.docId,
                blmPointId: after.blm_point_id,
                county: after.county,
                surveyor,
              },
            } satisfies SubmissionRejectedEvent,
            {
              id: `county-rejection-${event.params.docId}`,
              scheduleDelaySeconds: 0, // execute immediately
              uri: getFunctionUrl('email'),
            },
          );
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'errorInfo' in (error as { errorInfo?: { code?: string } }) &&
            (error as { errorInfo: { code: string } }).errorInfo.code === 'functions/task-already-exists'
          ) {
            logger.debug('skipping, task already exists', {
              task: `county-rejection`,
              type: 'email',
              document: event.params.docId,
            });
          } else {
            logger.error('failed to enqueue task', {
              error,
              task: `ugrc-rejection`,
              type: 'email',
              document: event.params.docId,
            });
          }
        }
      }

      break;
    }
    default: {
      logger.error('[queueTasks] skipping, unknown status change', statusChange);

      return false;
    }
  }

  return true;
}

export async function approveCounty(event: { data: { documentId: string } }): Promise<void> {
  const documentId = event.data.documentId;
  const ref = db.collection('submissions').doc(documentId);
  const snap = await ref.get();

  if (!snap.exists) {
    logger.warn(`[approveCounty] skipping, document does not exist anymore: ${documentId}`);

    return;
  }

  const data = snap.data();
  if (!data) {
    logger.warn(`[approveCounty] skipping, document data is undefined: ${documentId}`);

    return;
  }

  if (data.status.county.approved !== null) {
    logger.debug('[approveCounty] skipping, county review already complete', { status: data.status });

    return;
  }

  const updates = {
    'status.county.reviewedAt': DateTime.now().setZone('America/Denver').toJSDate(),
    'status.county.reviewedBy': 'County*',
    'status.county.approved': true,
  } as CountyReview;

  logger.info('[approveCounty] updating county approval status', { before: data.status.county, after: updates });

  await ref.update(updates);

  if (data.metadata.mrrc) {
    const fiscalYear = getFiscalYear(new Date());

    logger.debug(`[approveCounty] updating mrrc submission counts for FY${fiscalYear}`, {
      county: data.county,
      mrrc: data.metadata.mrrc,
    });

    const statsRef = db.collection('stats').doc(`mrrc-${fiscalYear}`);
    const county = data.county.toLowerCase().replace(/\s+/g, '-');

    await db.runTransaction(async (transaction) => {
      const statsSnap = await transaction.get(statsRef);
      let statsData = statsSnap.exists ? statsSnap.data() : {};

      if (!statsData) {
        statsData = {};
      }

      statsData[county] = (statsData[county] ?? 0) + 1;

      transaction.set(statsRef, statsData, { merge: true });
    });
  }
}

export async function sendMail(event: { data: EmailEvent }): Promise<void> {
  const { type, payload } = event.data;
  logger.info(`[sendMail] processing email event of type: ${type}`);

  switch (type) {
    case 'submission-in-county': {
      logger.info(`[sendMail] Notifying ${payload.county} about submission ${payload.blmPointId}`);

      const content = await getBase64EncodedAttachment(bucket.file(payload.monumentBucketPath).createReadStream());
      const contacts = await getContactsToNotify(db, payload.county);

      const templateData = {
        blmPointId: payload.blmPointId,
        surveyor: payload.surveyor.name,
        day: getMountainTimeFutureDate(10),
      };

      const template = {
        method: 'POST' as const,
        url: '/v3/mail/send',
        body: {
          template_id: 'd-a1dd2b8a4ae84c909ca2bc218af724de',
          from: {
            email: 'ugrc-plss-reviewers@utah.gov',
            name: 'UGRC PLSS Staff',
          },
          personalizations: [
            {
              to: contacts,
              dynamic_template_data: templateData,
            },
          ],
          attachments: [
            {
              content,
              filename: `${payload.blmPointId}-review.pdf`,
              type: 'application/pdf',
              disposition: 'attachment',
            },
          ],
        },
      };

      logger.info('[sendMail] sending notification email to', { contacts, templateData });

      const result = await notify(process.env.SENDGRID_API_KEY ?? 'empty', template);

      logger.debug('[sendMail] mail sent with status', { statusCode: result[0].statusCode });

      break;
    }

    case 'submission-rejected': {
      logger.info(`[sendMail] Notifying surveyor about rejection of ${payload.blmPointId}`);

      const templateData = {
        blmPointId: payload.blmPointId,
        surveyor: payload.surveyor.name,
        county: payload.county,
      };

      const template = {
        method: 'POST' as const,
        url: '/v3/mail/send',
        body: {
          template_id: 'd-27953d934df34a6eb39775402d826b9a',
          from: {
            email: 'ugrc-plss-reviewers@utah.gov',
            name: 'UGRC PLSS Staff',
          },
          personalizations: [
            {
              to: [payload.surveyor],
              dynamic_template_data: templateData,
            },
          ],
        },
      };

      logger.info('[sendMail] sending rejection notification email to', { surveyor: payload.surveyor, templateData });

      try {
        const result = await notify(process.env.SENDGRID_API_KEY ?? 'empty', template);

        logger.debug('[sendMail] mail sent with status', { statusCode: result[0].statusCode });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in (error as { response?: { body?: { errors?: unknown[] } } }) &&
          (error as { response: { body: { errors: unknown[] } } }).response.body?.errors
        ) {
          logger.error('[sendMail] failed to send rejection email', {
            errors: (error as { response: { body: { errors: unknown[] } } }).response.body.errors,
          });
        } else {
          logger.error('[sendMail] failed to send rejection email', { error });
        }

        throw error;
      }

      break;
    }

    default: {
      logger.error(`[sendMail] Unknown email event type: ${type}`);

      throw new Error(`Unknown email event type: ${type}`);
    }
  }
}

export async function publishSubmissions(): Promise<void> {
  logger.info('[publishSubmissions] Starting submission publishing process');
  let submissionsSnapshot;

  try {
    submissionsSnapshot = await getSubmissionsReadyForPublishing(db);
  } catch (error) {
    logger.error('[publishSubmissions] Error fetching submissions ready for publishing', { error });

    throw error;
  }

  if (submissionsSnapshot.empty) {
    logger.info('[publishSubmissions] No submissions ready for publishing');

    return;
  }

  logger.info(`[publishSubmissions] Found ${submissionsSnapshot.size} submissions ready to be published`);

  const features: AGOLAttributes[] = [];
  const updateMap: (PublishingMetadata & { id: number; submissionId: string })[] = [];
  const storageMigrations: BucketFileMigration[] = [];
  const successfulSubmissions = new Set<string>();

  const token = await getAGOLToken();

  if (!token) {
    logger.error(`[publishSubmissions] AGOL token is not available`);

    return;
  }

  for (const submissionDoc of submissionsSnapshot.docs) {
    const submission = submissionDoc.data();

    if (!submission) {
      logger.warn(`[publishSubmissions] Document is undefined`, { document: submissionDoc.id });

      continue;
    }

    const submissionId = submissionDoc.id;

    logger.debug(`[publishSubmissions] Processing ${submissionDoc.ref.path}`, submission);

    try {
      const attributes = await getAttributesFor(submission.blm_point_id, token);

      if (!attributes) {
        logger.warn(`[publishSubmissions] No feature service data found`, {
          blmPointId: submission.blm_point_id,
        });

        continue;
      }

      const modifications = calculateFeatureUpdates(submission.metadata.corner, submission.metadata.mrrc, attributes);

      if (Object.keys(modifications).length === 0) {
        logger.debug(`[publishSubmissions] No updates needed for submission ${submissionDoc.ref.path}`, {
          submission,
        });

        // If no modifications, we still need to move the sheet
        const metadata = {
          document: `under-review/${submission.blm_point_id}/${submission.submitted_by.id}/${submissionId}.pdf`,
          referenceCorner: ['WC', 'MC', 'RC', 'Other'].includes(submission.metadata.corner),
          cornerType: ['WC', 'MC', 'RC', 'Other'].includes(submission.metadata.corner)
            ? submission.metadata.corner
            : undefined,
          mrrc: submission.metadata.mrrc,
          blmPointId: submission.blm_point_id,
        };

        const destinationPath = generateSheetName({ ...metadata, today: new Date() });

        storageMigrations.push({
          from: metadata.document,
          to: destinationPath,
        });

        // Track this submission as successful since it doesn't need AGOL updates
        successfulSubmissions.add(submissionId);

        continue;
      }

      logger.debug(`[publishSubmissions] Staging edit for ${submissionDoc.ref.path}`, {
        modifications,
        document: submissionDoc.ref.path,
        blmPointId: submission.blm_point_id,
      });

      // check if the objectid exists in the features array
      const existingFeature = features.find((f) => f.attributes.OBJECTID === attributes.id);

      if (existingFeature) {
        logger.info(`[publishSubmissions] Duplicate OBJECTID found for ${attributes.id}`, {
          attributes: {
            OBJECTID: attributes.id,
            ...modifications,
          },
        });

        existingFeature.attributes = mergeUpdates(existingFeature, modifications);
      } else {
        features.push({
          attributes: {
            OBJECTID: attributes.id,
            ...modifications,
          },
        });
      }

      updateMap.push({
        id: attributes.id,
        submissionId,
        document: `under-review/${submission.blm_point_id}/${submission.submitted_by.id}/${submissionId}.pdf`,
        referenceCorner: ['WC', 'MC', 'RC', 'Other'].includes(submission.metadata.corner),
        cornerType: ['WC', 'MC', 'RC', 'Other'].includes(submission.metadata.corner)
          ? submission.metadata.corner
          : undefined,
        mrrc: submission.metadata.mrrc,
        blmPointId: submission.blm_point_id,
      });
    } catch (error) {
      logger.error(`[publishSubmissions] Error preparing agol feature service edits ${submissionId}`, {
        error,
      });
    }
  }

  try {
    const results = await updateFeatureService(features);

    for (const result of results) {
      if (!result.success) {
        logger.error(`[publishSubmissions] Failed to update feature service for OBJECTID ${result.objectId}`, {
          error: result.error,
        });

        continue;
      } else {
        // remove successful features
        const index = features.findIndex((f) => f.attributes.OBJECTID === result.objectId);

        if (index !== -1) {
          features.splice(index, 1);
        }
      }

      const metadataEntries = updateMap.filter((entry) => entry.id === result.objectId);

      if (metadataEntries.length === 0) {
        logger.error(`[publishSubmissions] No metadata found for objectId ${result.objectId}`, { updateMap });

        continue;
      }

      for (const metadata of metadataEntries) {
        const destinationPath = generateSheetName({ ...metadata, today: new Date() });

        storageMigrations.push({
          from: metadata.document,
          to: destinationPath,
        });

        // Track this submission as successful
        successfulSubmissions.add(metadata.submissionId);
      }
    }
  } catch (error) {
    logger.error('[publishSubmissions] Error updating feature service', { error });

    throw error;
  }

  if (features.length > 0) {
    logger.warn('[publishSubmissions] Some features were not updated successfully', {
      featuresCount: features.length,
      features,
    });
  }

  if (storageMigrations.length === 0) {
    logger.info('[publishSubmissions] No storage migrations needed');

    return;
  }

  logger.info('[publishSubmissions] Moving sheets to public bucket', { storageMigrations });

  await moveSheetsToFinalLocation(bucket, storageMigrations);

  logger.info(
    `[publishSubmissions] Processing ${successfulSubmissions.size} successful submissions out of ${submissionsSnapshot.size} total`,
  );

  for (const submissionDoc of submissionsSnapshot.docs) {
    const submissionId = submissionDoc.id;

    if (!successfulSubmissions.has(submissionId)) {
      logger.warn(`[publishSubmissions] Skipping update for ${submissionId} - processing was not successful`);
      continue;
    }

    const ref = db.collection('submissions').doc(submissionId);

    try {
      await ref.update({
        published: true,
        'status.publishedAt': DateTime.now().setZone('America/Denver').toJSDate(),
        'status.publishedBy': 'System',
      });

      logger.info(`[publishSubmissions] Updated submission ${submissionId} to published`);
    } catch (error) {
      logger.error(`[publishSubmissions] Failed to update submission ${submissionId} to published`, { error });
    }
  }

  logger.info('[publishSubmissions] Completed submission publishing process');
}
