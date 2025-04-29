import * as admin from 'firebase-admin';
import { initializeFirebase } from './utils';

const db = initializeFirebase(process.argv.slice(2));
if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

async function elevate(): Promise<void> {
  console.log('Adding elevate to all users...');

  try {
    const snapshot = await db.collection('submitters').get();

    if (snapshot.empty) {
      console.log('No users found. Nothing to migrate.');

      return;
    }

    console.log(`Found ${snapshot.size} users to update.`);

    const batchSize = 500;
    const batches: admin.firestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationsCount = 0;

    snapshot.docs.map((doc) => {
      currentBatch.update(doc.ref, {
        elevated: false,
        tenant: 'default',
      });

      operationsCount++;

      if (operationsCount >= batchSize) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationsCount = 0;
      }

      if (operationsCount > 0) {
        batches.push(currentBatch);
      }
    });

    await Promise.all(batches.map((batch) => batch.commit()));

    console.log('Successfully migrated.');
  } catch (error) {
    console.error('Error migrating:', error);
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
