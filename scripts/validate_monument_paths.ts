import { getStorage } from 'firebase-admin/storage';
import { initializeFirebase } from './utils.ts';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const projectArg = process.argv.find((arg) => arg.startsWith('--project='));
const projectId = projectArg?.split('=')[1] || 'ut-dts-agrc-plss-dev';
const bucketName = process.env.STORAGE_BUCKET || `${projectId}.appspot.com`;
const bucket = getStorage().bucket(bucketName);

function getMonumentPath(monument: unknown): string | undefined {
  if (typeof monument !== 'string' || monument.trim() === '') {
    return undefined;
  }

  return monument;
}

function getPublishedAt(data: FirebaseFirestore.DocumentData): string {
  const publishedAt = data.status.publishedAt;

  if (publishedAt && typeof publishedAt.toDate === 'function') {
    return publishedAt.toDate().toISOString();
  }

  return 'missing';
}

async function validateMonumentPath(doc: FirebaseFirestore.QueryDocumentSnapshot): Promise<boolean> {
  const data = doc.data();
  const monumentPath = getMonumentPath(data.monument);
  const publishedAt = getPublishedAt(data);

  if (!monumentPath) {
    console.warn(`Missing monument path for ${doc.id} (publishedAt: ${publishedAt})`);
    return false;
  }

  const [exists] = await bucket.file(monumentPath).exists();
  if (!exists) {
    console.warn(`Invalid storage object for ${doc.id} (publishedAt: ${publishedAt}): ${monumentPath}`);
  }

  return exists;
}

async function validate(): Promise<void> {
  console.log(`Starting monument path validation using bucket: ${bucketName}`);

  const snapshot = await db.collection('submissions').get();
  let validPaths = 0;
  let invalidPaths = 0;

  for (const doc of snapshot.docs) {
    if (await validateMonumentPath(doc)) {
      validPaths++;
    } else {
      invalidPaths++;
    }
  }

  console.log(`Validated ${snapshot.size} submissions: ${validPaths} valid monument paths, ${invalidPaths} invalid.`);
}

validate()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
