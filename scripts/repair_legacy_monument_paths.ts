import { getStorage } from 'firebase-admin/storage';
import { initializeFirebase } from './utils.ts';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const execute = process.argv.includes('--execute');
const projectArg = process.argv.find((arg) => arg.startsWith('--project='));
const projectId = projectArg?.split('=')[1] || 'ut-dts-agrc-plss-dev';
const bucketName = process.env.STORAGE_BUCKET || `${projectId}.appspot.com`;
const bucket = getStorage().bucket(bucketName);

function getLegacyPath(monument: unknown): string | undefined {
  if (typeof monument !== 'string' || !monument.startsWith('tiesheets/') || !monument.endsWith('.pdf')) {
    return undefined;
  }

  return monument;
}

function getFilenameStem(path: string): string | undefined {
  const match = path.match(/^(.*)_\d{4}-\d{2}-\d{2}(?:_\d+)?\.pdf$/);
  return match?.[1];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findReplacementPath(path: string): Promise<string | undefined> {
  const filenameStem = getFilenameStem(path);
  if (!filenameStem) {
    return undefined;
  }

  const directory = filenameStem.slice(0, filenameStem.lastIndexOf('/') + 1);
  const filenamePattern = new RegExp(`^${escapeRegExp(filenameStem)}_\\d{4}-\\d{2}-\\d{2}(?:_\\d+)?\\.pdf$`);
  const [files] = await bucket.getFiles({ prefix: directory });
  const candidates = files.map((file) => file.name).filter((name) => filenamePattern.test(name));

  return candidates.length === 1 ? candidates[0] : undefined;
}

async function repair(): Promise<void> {
  console.log(`Starting legacy monument path repair${execute ? '' : ' preview'} using bucket: ${bucketName}`);

  const snapshot = await db.collection('submissions').where('published', '==', true).get();
  let invalidPaths = 0;
  let repaired = 0;
  let skipped = 0;
  let batch = db.batch();
  let operations = 0;

  for (const doc of snapshot.docs) {
    const legacyPath = getLegacyPath(doc.data().monument);
    if (!legacyPath || (await bucket.file(legacyPath).exists())[0]) {
      continue;
    }

    invalidPaths++;
    const replacementPath = await findReplacementPath(legacyPath);

    if (!replacementPath) {
      skipped++;
      console.warn(`Skipping ${doc.id}: no unique Storage match for ${legacyPath}`);
      continue;
    }

    console.log(`${execute ? 'Repairing' : 'Would repair'} ${doc.id}: ${legacyPath} -> ${replacementPath}`);

    if (!execute) {
      continue;
    }

    batch.update(doc.ref, { monument: replacementPath });
    operations++;
    repaired++;

    if (operations === 500) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (execute && operations > 0) {
    await batch.commit();
  }

  console.log(
    `${execute ? 'Repaired' : 'Found'} ${execute ? repaired : invalidPaths - skipped} of ${invalidPaths} invalid legacy paths; skipped ${skipped} ambiguous or unmatched paths.`,
  );
}

repair()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });