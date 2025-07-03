import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

async function migrate(): Promise<void> {
  console.log('Starting migration to add published = false to all submissions...');

  try {
    // Get all submissions
    const submissionsSnapshot = await db.collection('submissions').get();

    if (submissionsSnapshot.empty) {
      console.log('No submissions found to migrate.');
      return;
    }

    console.log(`Found ${submissionsSnapshot.size} submissions to migrate.`);

    // Process documents in batches to avoid overwhelming Firestore
    const batchSize = 500;
    let batch = db.batch();
    let operationCount = 0;
    let totalProcessed = 0;

    for (const doc of submissionsSnapshot.docs) {
      const data = doc.data();

      // Check if published field already exists
      if (data.published !== undefined) {
        console.log(`Skipping document ${doc.id} - published field already exists`);
        continue;
      }

      // Add published = false to the document
      batch.update(doc.ref, { published: false });
      operationCount++;
      totalProcessed++;

      // Commit batch when we reach the batch size
      if (operationCount === batchSize) {
        console.log(`Committing batch of ${operationCount} operations...`);
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      console.log(`Committing final batch of ${operationCount} operations...`);
      await batch.commit();
    }

    console.log(`Successfully migrated ${totalProcessed} submissions.`);
  } catch (error) {
    console.error('Error migrating submissions:', error);
    throw error;
  }
}

migrate()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
