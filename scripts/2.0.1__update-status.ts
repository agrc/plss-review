import * as admin from 'firebase-admin';
import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

async function migrate(): Promise<void> {
  console.log('Starting update of submission status...');

  try {
    const snapshot = await db.collection('submissions').get();

    if (snapshot.empty) {
      console.log('No submissions found. Nothing to migrate.');
      return;
    }

    console.log(`Found ${snapshot.size} submissions to migrate.`);

    const batchSize = 500;
    const batches: admin.firestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationsCount = 0;

    await Promise.all(
      snapshot.docs.map(async (doc) => {
        currentBatch.set(
          doc.ref,
          {
            status: {
              county: {
                approved: null,
                comments: null,
                reviewedAt: null,
                reviewedBy: null,
              },
              ugrc: {
                approved: null,
                comments: null,
                reviewedAt: null,
                reviewedBy: null,
              },
            },
          },
          {
            mergeFields: ['status.county', 'status.ugrc'],
          },
        );

        operationsCount++;

        if (operationsCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationsCount = 0;
        }
      }),
    );

    if (operationsCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map((batch) => batch.commit()));

    console.log('Successfully migrated all submissions.');
  } catch (error) {
    console.error('Error migrating submissions:', error);
    throw error;
  }
}

migrate()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
