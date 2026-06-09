import { GeoPoint } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const COUNTIES = [
  'Beaver',
  'Box Elder',
  'Cache',
  'Carbon',
  'Daggett',
  'Davis',
  'Duchesne',
  'Emery',
  'Garfield',
  'Grand',
  'Iron',
  'Juab',
  'Kane',
  'Millard',
  'Morgan',
  'Piute',
  'Rich',
  'Salt Lake',
  'San Juan',
  'Sanpete',
  'Sevier',
  'Summit',
  'Tooele',
  'Uintah',
  'Utah',
  'Wasatch',
  'Washington',
  'Wayne',
  'Weber',
];

const SMALL_COUNT = 30;
const LARGE_COUNT = 2000;
const MAX_BATCH_WRITES = 500;
const MAX_CONCURRENT_UPLOADS = 100;

function readArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg?.slice(prefix.length);
}

function resolveCount() {
  const mode = readArg('--mode') ?? 'small';
  const explicitCount = readArg('--count');

  if (explicitCount) {
    const parsed = Number(explicitCount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new Error(`Invalid --count value: ${explicitCount}`);
    }

    return {
      count: Math.floor(parsed),
      mode: `custom(${Math.floor(parsed)})`,
    };
  }

  if (mode === 'small') {
    return { count: SMALL_COUNT, mode };
  }

  if (mode === 'large') {
    return { count: LARGE_COUNT, mode };
  }

  throw new Error(`Invalid --mode value: ${mode}. Use --mode=small or --mode=large.`);
}

// Reuse the Davis blm_point_id and doc ID so Storage resolves to an existing PDF.
const DAVIS_BLM_POINT_ID = 'UT260030S0060W0_160340';
const DAVIS_USER_ID = 'Y0D4o9od4ojHpGaL9gg6uK3dgNuK';
const DAVIS_PDF_PATH = `under-review/${DAVIS_BLM_POINT_ID}/${DAVIS_USER_ID}/seed-under-review-davis.pdf`;

// Minimal valid PDF content for local emulator seeding.
const BULK_PDF_BYTES = Buffer.from(
  'JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCAzMDAgMTQ0XS9Db250ZW50cyA0IDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNSAwIFI+Pj4+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNTU+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDEwMCAxMDAgVGQgKEJ1bGsgU2VlZCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNTMgMDAwMDAgbiAKMDAwMDAwMDEwMiAwMDAwMCBuIAowMDAwMDAwMjExIDAwMDAwIG4gCjAwMDAwMDAzMTYgMDAwMDAgbiAKdHJhaWxlcgo8PC9Sb290IDEgMCBSL1NpemUgNj4+CnN0YXJ0eHJlZgozOTQKJSVFT0Y=',
  'base64',
);

async function main() {
  const { count, mode } = resolveCount();

  let batch = db.batch();
  let writesInBatch = 0;
  let committedBatchCount = 0;
  const bucket = getStorage().bucket('localhost');
  let uploadTasks: Promise<unknown>[] = [];

  const commitBatch = async () => {
    if (writesInBatch === 0) {
      return;
    }

    await batch.commit();
    committedBatchCount += 1;
    batch = db.batch();
    writesInBatch = 0;
  };

  const flushUploads = async () => {
    if (!uploadTasks.length) {
      return;
    }

    await Promise.all(uploadTasks);
    uploadTasks = [];
  };

  // Ensure the known Davis path exists for baseline/manual testing.
  uploadTasks.push(
    bucket.file(DAVIS_PDF_PATH).save(BULK_PDF_BYTES, {
      metadata: {
        contentType: 'application/pdf',
        contentDisposition: 'inline; filename="seed-under-review-davis.pdf"',
      },
      resumable: false,
    }),
  );

  for (let i = 0; i < count; i++) {
    const padded = String(i + 1).padStart(3, '0');
    const county = COUNTIES[i % COUNTIES.length];
    const docId = `seed-bulk-received-${padded}`;

    const ref = db.collection('submissions').doc(docId);
    batch.set(ref, {
      blm_point_id: DAVIS_BLM_POINT_ID,
      created_at: new Date(),
      county,
      type: 'existing',
      metadata: {
        pdf: `submitters/uid/existing/point_id/existing-sheet.pdf`,
        mrrc: i % 3 === 0,
      },
      location: new GeoPoint(40.5 + i * 0.01, -112.5 - i * 0.01),
      pdf: DAVIS_PDF_PATH,
      datum: 'geographic-nad83',
      submitted_by: {
        id: DAVIS_USER_ID,
        name: 'Bulk Seed User',
        ref: `submitters/${DAVIS_USER_ID}`,
      },
      geographic: {
        northing: { seconds: 10, minutes: 14, degrees: 41 },
        easting: { seconds: 29, minutes: 14, degrees: 111 },
        unit: 'm',
        elevation: 3200,
      },
      grid: {
        zone: 'north',
        unit: 'm',
        easting: 521679.496,
        northing: 1100285.503,
        verticalDatum: '',
        elevation: null,
      },
      status: {
        ugrc: {
          approved: null,
          comments: null,
          reviewedAt: null,
          reviewedBy: null,
        },
        county: {
          approved: null,
          comments: null,
          reviewedAt: null,
          reviewedBy: null,
        },
        sgid: {
          approved: null,
        },
        user: {
          cancelled: null,
        },
      },
    });
    writesInBatch += 1;
    if (writesInBatch === MAX_BATCH_WRITES) {
      await commitBatch();
    }

    // review.tsx resolves PDFs by {blm_point_id}/{submitted_by.id}/{docId}.pdf
    const targetPdfPath = `under-review/${DAVIS_BLM_POINT_ID}/${DAVIS_USER_ID}/${docId}.pdf`;
    uploadTasks.push(
      bucket.file(targetPdfPath).save(BULK_PDF_BYTES, {
        metadata: {
          contentType: 'application/pdf',
          contentDisposition: `inline; filename="${docId}.pdf"`,
        },
        resumable: false,
      }),
    );

    if (uploadTasks.length === MAX_CONCURRENT_UPLOADS) {
      await flushUploads();
    }
  }

  await commitBatch();
  await flushUploads();
  console.log(
    `Seeded ${count} bulk "received" submissions (mode: ${mode}, Firestore batches: ${committedBatchCount}).`,
  );
}

main().catch((error) => {
  console.error('Error seeding bulk submissions:', error);
  process.exit(1);
});
