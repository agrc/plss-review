import client from '@sendgrid/client';
import type { ClientRequest } from '@sendgrid/client/src/request.js';
import { Base64Encode } from 'base64-stream';
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

type Contact = {
  name: string;
  email: string;
};

export const notify = (key: string, template: ClientRequest) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.warn(
      'Skipping mail send and returning a fake promise',
      { nodeEnv: process.env.NODE_ENV },
      {
        structuredData: true,
      },
    );

    return Promise.resolve([
      {
        statusCode: 202,
        body: '',
        headers: {
          server: 'nginx',
        },
      },
    ]);
  }

  const keySnippet = key.slice(0, 4);

  logger.debug('sendgrid key', keySnippet, {
    structuredData: true,
  });

  client.setApiKey(key);

  return client.request(template);
};

export const getContactsToNotify = async (db: Firestore, county: string) => {
  const documentReference = db.collection('contacts').doc('admin');
  const documentSnapshot = await documentReference.get();

  if (!documentSnapshot.exists) {
    logger.error('contacts document does not exist', {
      structuredData: true,
    });

    return [];
  }

  const data = documentSnapshot.data();
  if (!data) {
    logger.error('contacts document data is undefined');

    return [];
  }

  county = county.toLowerCase();
  if (!(county in data)) {
    logger.error('county not found in contacts document', county, {
      structuredData: true,
    });

    return [];
  }

  const contacts = data[county] as Contact[];

  return contacts;
};

export const getBase64EncodedAttachment = (stream: NodeJS.ReadableStream) => {
  const chunks = new Base64Encode();

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => {
      logger.error('encode pdf error', err, { structuredData: true });

      return reject(err);
    });
    stream.on('data', (chunk) => chunks.write(chunk));
    stream.on('end', () => {
      chunks.end();

      return resolve(chunks.read());
    });
  });
};
