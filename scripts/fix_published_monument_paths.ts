import { initializeFirebase } from './utils.ts';

const generateSheetName = (metadata: {
  referenceCorner: boolean;
  mrrc: boolean;
  blmPointId: string;
  today: Date;
  cornerType?: string;
}): string => {
  let name = metadata.blmPointId;

  // Add corner prefix if it's a reference corner
  if (metadata.referenceCorner) {
    const validCornerTypes = ['WC', 'MC', 'RC'];

    if (metadata.cornerType && validCornerTypes.includes(metadata.cornerType)) {
      name = `${metadata.cornerType}_${name}`;
    }
  }

  // Add MRRC prefix if mrrc is true
  if (metadata.mrrc === true) {
    name = `MRRC_${name}`;
  }

  const formattedDate = metadata.today.toISOString().slice(0, 10);

  name = `${name}_${formattedDate}`;

  return `tiesheets/${metadata.blmPointId}/${name}.pdf`;
};

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const execute = process.argv.includes('--execute');
const referenceCorners = ['WC', 'MC', 'RC', 'Other'];

function getDestinationPath(data: FirebaseFirestore.DocumentData): string | undefined {
  const blmPointId = data.blm_point_id;
  const publishedAt = data.status?.publishedAt?.toDate?.();

  if (typeof blmPointId !== 'string' || !(publishedAt instanceof Date)) {
    return undefined;
  }

  const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const corner = typeof metadata.corner === 'string' ? metadata.corner : undefined;
  const isReferenceCorner = corner ? referenceCorners.includes(corner) : false;

  return generateSheetName({
    referenceCorner: isReferenceCorner,
    cornerType: isReferenceCorner ? corner : undefined,
    mrrc: metadata.mrrc === true,
    blmPointId,
    today: publishedAt,
  });
}

function needsMonumentRepair(monument: unknown): boolean {
  return typeof monument !== 'string' || monument.trim() === '' || monument.startsWith('under-review/');
}

async function migrate(): Promise<void> {
  console.log(`Starting published monument repair${execute ? '' : ' preview'}...`);

  const snapshot = await db.collection('submissions').where('published', '==', true).get();
  let candidates = 0;
  let skipped = 0;
  let repaired = 0;
  let batch = db.batch();
  let operations = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (!needsMonumentRepair(data.monument)) {
      continue;
    }

    candidates++;
    const destinationPath = getDestinationPath(data);

    if (!destinationPath) {
      skipped++;
      console.warn(`Skipping ${doc.id}: missing blm_point_id or status.publishedAt`);
      continue;
    }

    console.log(`${execute ? 'Repairing' : 'Would repair'} ${doc.id}: ${destinationPath}`);

    if (!execute) {
      continue;
    }

    batch.update(doc.ref, { monument: destinationPath });
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

  const repairedCount = execute ? repaired : candidates - skipped;
  console.log(
    `${execute ? 'Repaired' : 'Found'} ${repairedCount} of ${candidates} candidate submissions; skipped ${skipped}.`,
  );
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
