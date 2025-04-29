import * as admin from 'firebase-admin';
import { initializeFirebase } from './utils';

const db = initializeFirebase(process.argv.slice(2));
if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

async function elevate(): Promise<void> {
  console.log('Starting elevation of authorized users...');

  try {
    const snapshot = await db.collection('authorized-users').get();

    if (snapshot.empty) {
      console.log('No authorized users found. Nothing to migrate.');
      return;
    }

    console.log(`Found ${snapshot.size} authorized users to migrate.`);

    const batchSize = 500;
    const batches: admin.firestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationsCount = 0;

    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const userEmail = doc.id;
        const data = await db.collection('submitters').where('email', '==', userEmail).get();

        if (data.empty) {
          console.log(`No matching submitter found for ${userEmail}.`);
          return;
        }

        if (data.size === 1) {
          const submitterDoc = data.docs[0];

          currentBatch.update(submitterDoc.ref, {
            elevated: true,
          });

          operationsCount++;

          if (operationsCount >= batchSize) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            operationsCount = 0;
          }
        }
      }),
    );

    if (operationsCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map((batch) => batch.commit()));

    console.log('Successfully migrated all authorized users.');
  } catch (error) {
    console.error('Error migrating authorized users:', error);
    throw error;
  }
}

elevate()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
