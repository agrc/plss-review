import { onRequest } from 'firebase-functions/https';
import { beforeUserSignedIn } from 'firebase-functions/identity';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { approveCounty, authorizeUser, publishSubmissions, queueTasks, sendMail } from './functions.js';

const sendGridApiKey = defineSecret('SENDGRID_API_KEY');
const agolCredentials = defineSecret('AGOL_CREDENTIALS');

const basicQueueSettings = {
  retryConfig: {
    maxAttempts: 10,
    minBackoffSeconds: 60,
  },
  rateLimits: {
    maxConcurrentDispatches: 6,
  },
};
const cors = [/ut-dts-agrc-plss-dev-staff-review\.web\.app$/, /localhost:\d+$/];

const health = onRequest({ cors, region: 'us-west3' }, async (_, res) => {
  res.send('healthy');
});

// Only export health check in emulator mode
export const healthCheck = process.env.FUNCTIONS_EMULATOR === 'true' ? health : undefined;

export const beforeSignedIn = beforeUserSignedIn(authorizeUser);
export const onSubmissionUpdated = onDocumentUpdated({ document: 'submissions/{docId}' }, queueTasks);

export const autoApprovals = onTaskDispatched({ ...basicQueueSettings }, approveCounty);
export const email = onTaskDispatched(
  {
    ...basicQueueSettings,
    secrets: [sendGridApiKey],
  },
  sendMail,
);

export const publish = onSchedule(
  {
    schedule: '0 22 * * *',
    timeZone: 'America/Denver',
    retryCount: 5,
    secrets: [agolCredentials],
  },
  publishSubmissions,
);
