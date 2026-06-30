import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const enqueueMock = vi.fn();

vi.mock('firebase-admin/functions', () => ({
  getFunctions: () => ({
    taskQueue: () => ({
      enqueue: enqueueMock,
    }),
  }),
}));

vi.mock('../src/firebase', async () => {
  const actual = await vi.importActual('../src/firebase');

  return {
    ...actual,
    getFunctionUrl: vi.fn().mockImplementation((name: string) => `https://example.test/${name}`),
  };
});

import { safelyInitializeApp } from '../src/firebase';
import { queueTasks } from '../src/functions';

async function ensureEmulatorConnection(): Promise<void> {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = process.env.GCLOUD_PROJECT;

  if (!emulatorHost || !emulatorHost.includes('127.0.0.1')) {
    throw new Error(
      'SAFETY CHECK FAILED: FIRESTORE_EMULATOR_HOST must be set to localhost. Current value: ' + emulatorHost,
    );
  }

  if (!projectId || projectId.includes('prod') || projectId.includes('production')) {
    throw new Error('SAFETY CHECK FAILED: GCLOUD_PROJECT appears to be production. Current value: ' + projectId);
  }
}

let db: FirebaseFirestore.Firestore;

describe('queueTasks', () => {
  beforeAll(async () => {
    await ensureEmulatorConnection();
    safelyInitializeApp();
    db = getFirestore();
  });

  beforeEach(async () => {
    const collections = await db.listCollections();
    await Promise.all(
      collections.map(async (collection) => {
        const snapshot = await collection.get();

        await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      }),
    );

    enqueueMock.mockReset();
    enqueueMock.mockResolvedValue(undefined);
  });

  it('loads the submitter when submitted_by.ref is a document reference', async () => {
    const submitterRef = db.collection('submitters').doc('test-user-id');

    await db.collection('submitters').doc('test-user-id').set({
      displayName: 'Surveyor Person',
      email: 'surveyor@example.com',
    });

    const event = {
      params: {
        docId: 'submission-123',
      },
      data: {
        before: {
          data: () => ({
            blm_point_id: 'UT123456',
            county: 'Salt Lake',
            submitted_by: {
              id: 'test-user-id',
              ref: submitterRef,
            },
            status: {
              ugrc: {
                approved: null,
                reviewedAt: null,
                reviewedBy: null,
              },
              county: {
                approved: null,
                reviewedAt: null,
                reviewedBy: null,
              },
            },
          }),
        },
        after: {
          data: () => ({
            blm_point_id: 'UT123456',
            county: 'Salt Lake',
            submitted_by: {
              id: 'test-user-id',
              ref: submitterRef,
            },
            status: {
              ugrc: {
                approved: true,
                reviewedAt: Timestamp.fromDate(new Date()),
                reviewedBy: 'reviewer@example.com',
              },
              county: {
                approved: null,
                reviewedAt: null,
                reviewedBy: null,
              },
            },
          }),
        },
      },
    };

    await expect(queueTasks(event as never)).resolves.toBe(true);

    expect(enqueueMock).toHaveBeenCalledTimes(2);
    expect(enqueueMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'submission-in-county',
        payload: expect.objectContaining({
          surveyor: {
            name: 'Surveyor Person',
            email: 'surveyor@example.com',
          },
        }),
      }),
      expect.objectContaining({
        id: 'submission-in-county-submission-123',
      }),
    );
  });

  it('passes rejected reason and notes to submission-rejected email payload', async () => {
    const submitterRef = db.collection('submitters').doc('test-user-id');

    await db.collection('submitters').doc('test-user-id').set({
      displayName: 'Surveyor Person',
      email: 'surveyor@example.com',
    });

    const event = {
      params: {
        docId: 'submission-456',
      },
      data: {
        before: {
          data: () => ({
            blm_point_id: 'UT654321',
            county: 'Salt Lake',
            submitted_by: {
              id: 'test-user-id',
              ref: submitterRef,
            },
            status: {
              ugrc: {
                approved: null,
                reviewedAt: null,
                reviewedBy: null,
                comments: null,
              },
              county: {
                approved: null,
                reviewedAt: null,
                reviewedBy: null,
                comments: null,
              },
            },
          }),
        },
        after: {
          data: () => ({
            blm_point_id: 'UT654321',
            county: 'Salt Lake',
            submitted_by: {
              id: 'test-user-id',
              ref: submitterRef,
            },
            status: {
              ugrc: {
                approved: false,
                reviewedAt: Timestamp.fromDate(new Date()),
                reviewedBy: 'reviewer@example.com',
                comments: 'missing-photo - Unable to read monument details',
              },
              county: {
                approved: null,
                reviewedAt: null,
                reviewedBy: null,
                comments: null,
              },
            },
          }),
        },
      },
    };

    await expect(queueTasks(event as never)).resolves.toBe(true);

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const [task, taskOptions] = enqueueMock.mock.calls[0];

    expect(task).toMatchObject({
      type: 'submission-rejected',
      payload: {
        rejectedReason: 'Irrelevant or missing photos',
        rejectedNotes: 'Unable to read monument details',
        surveyor: {
          name: 'Surveyor Person',
          email: 'surveyor@example.com',
        },
      },
    });
    expect(taskOptions).toMatchObject({
      id: 'ugrc-rejection-submission-456',
    });
  });
});
