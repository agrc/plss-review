import { onRequest } from 'firebase-functions/v2/https';

const cors = [/ut-dts-ugrc-plss-dev\.web\.app$/, /localhost:\d+$/];

const health = onRequest({ cors, region: 'us-west3' }, async (_, res) => {
  res.send('healthy');
});

// Only export health check in emulator mode
export const healthCheck = process.env.FUNCTIONS_EMULATOR === 'true' ? health : undefined;
