import * as admin from 'firebase-admin';
import { initializeFirebase } from './utils';

const db = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

async function removeAuthorizedUsers(): Promise<void> {
  console.log('Starting removal of authorized users...');

  try {
    const snapshot = await db.collection('authorized-users').get();

    if (snapshot.empty) {
      console.log('No authorized users found. Nothing to delete.');
      return;
    }

    console.log(`Found ${snapshot.size} authorized users to delete.`);

    const batchSize = 500;
    const batches: admin.firestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationsCount = 0;

    snapshot.docs.forEach((doc) => {
      currentBatch.delete(doc.ref);
      operationsCount++;

      if (operationsCount >= batchSize) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationsCount = 0;
      }
    });

    if (operationsCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map((batch) => batch.commit()));

    console.log('Successfully removed all authorized users.');
  } catch (error) {
    console.error('Error removing authorized users:', error);
    throw error;
  }
}

removeAuthorizedUsers()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
