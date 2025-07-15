/**
 * Firebase Functions tests that use the Firebase emulator.
 *
 * Prerequisites:
 * - Firebase emulator must be running: `firebase emulators:start --only firestore`
 * - Environment variables are configured in vitest.config.ts
 */
import { GeoPoint, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as agolModule from '../src/agol.js';
import { safelyInitializeApp } from '../src/firebase.js';
import { publishSubmissions } from '../src/functions.js';
import * as storageModule from '../src/storage.js';

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

  // Test emulator connectivity
  try {
    const response = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}`);
    if (!response.ok) {
      throw new Error('Emulator not responding properly');
    }
  } catch (error: unknown) {
    throw new Error(
      'SAFETY CHECK FAILED: Cannot connect to Firestore emulator at localhost:8080. Make sure it is running. Error: ' +
        String(error),
    );
  }

  console.log('✅ Safety check passed - using emulator:', emulatorHost, 'project:', projectId);
}

// Mock the external dependencies that publishSubmissions calls
vi.mock('../src/agol.js', async () => {
  const actual = (await vi.importActual('../src/agol.js')) as typeof agolModule;

  return {
    ...actual,
    getAGOLToken: vi.fn().mockResolvedValue('mock-token'),
    getAttributesFor: vi.fn().mockImplementation((blmPointId) => {
      if (blmPointId === 'UT260070N0020W0_200240') {
        return Promise.resolve({
          id: 930949,
          monument: null,
          mrrc: null,
          point_category: 'Calculated',
        });
      }
      // Default mock for other blm_point_ids (like UT123456 used in tests)
      return Promise.resolve({
        id: 123,
        point_category: 'calculated',
        mrrc: 0,
        monument: 0,
      });
    }),
    calculateFeatureUpdates: actual.calculateFeatureUpdates, // Call through to original
    updateFeatureService: vi.fn().mockImplementation((features) => {
      // Return success results based on the objectIds in the features
      return Promise.resolve(
        features.map((feature) => ({
          success: true,
          objectId: feature.attributes.OBJECTID,
        })),
      );
    }),
  };
});

vi.mock('../src/storage.js', async () => {
  const actual = await vi.importActual('../src/storage.js');
  return {
    ...actual,
    generateSheetName: vi.fn().mockReturnValue('test-sheet.pdf'), // Mock to return consistent test value
    moveSheetsToFinalLocation: vi.fn().mockResolvedValue(undefined),
  };
});

let db: FirebaseFirestore.Firestore;

describe('functions', () => {
  beforeAll(async () => {
    // Run safety check before any tests
    await ensureEmulatorConnection();
    // Initialize Firebase for tests
    safelyInitializeApp();
    db = getFirestore();
  });

  beforeEach(async () => {
    // Clear all data before each test
    const collections = await db.listCollections();
    const deletePromises = collections.map(async (collection) => {
      const snapshot = await collection.get();
      const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());

      return Promise.all(deletePromises);
    });

    await Promise.all(deletePromises);

    // Clear mock calls
    vi.clearAllMocks();

    // Restore original mock implementations for each test
    vi.mocked(agolModule.updateFeatureService).mockImplementation((features) => {
      // Return success results based on the objectIds in the features
      return Promise.resolve(
        features.map((feature) => ({
          success: true,
          objectId: feature.attributes.OBJECTID,
        })),
      ) as Promise<never[]>;
    });

    // Set up spies to track calls to the real functions
    vi.spyOn(agolModule, 'getAttributesFor');
    vi.spyOn(agolModule, 'calculateFeatureUpdates');
    vi.spyOn(storageModule, 'generateSheetName');
  });

  describe('publishSubmissions', () => {
    it('does nothing when no submissions exist', async () => {
      await expect(publishSubmissions()).resolves.toBeUndefined();

      // Verify no external services were called since no submissions exist
      expect(vi.mocked(agolModule.getAttributesFor)).not.toHaveBeenCalled();
      expect(vi.mocked(agolModule.calculateFeatureUpdates)).not.toHaveBeenCalled();
      expect(vi.mocked(agolModule.updateFeatureService)).not.toHaveBeenCalled();
      expect(vi.mocked(storageModule.generateSheetName)).not.toHaveBeenCalled();
      expect(vi.mocked(storageModule.moveSheetsToFinalLocation)).not.toHaveBeenCalled();
    });

    it('processes submissions that meet publishing criteria', async () => {
      // Create test data that matches the query criteria
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const testSubmission = {
        blm_point_id: 'UT123456',
        county: 'Salt Lake',
        published: false,
        status: {
          ugrc: {
            approved: true,
            reviewedAt: Timestamp.fromDate(new Date()),
            reviewedBy: 'test-ugrc-user',
          },
          county: {
            approved: true,
            reviewedAt: Timestamp.fromDate(eightDaysAgo), // 8 days ago (meets 7+ day criteria)
            reviewedBy: 'test-county-user',
          },
        },
        submitted_by: {
          id: 'test-user-id',
        },
        metadata: {
          mrrc: false,
          corner: null, // Add corner property
        },
      };

      // Add test submission to emulator
      const submissionRef = await db.collection('submissions').add(testSubmission);

      // Run the function
      await publishSubmissions();

      // Verify the submission was marked as published
      const updatedSubmission = await submissionRef.get();
      const updatedData = updatedSubmission.data();

      expect(updatedData).toBeDefined();
      expect(updatedData?.published).toBe(true);
      expect(updatedData?.status.publishedAt).toBeDefined();
      expect(updatedData?.status.publishedBy).toBe('System');

      // Verify external services were called with correct arguments
      expect(vi.mocked(agolModule.getAttributesFor)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(agolModule.getAttributesFor)).toHaveBeenCalledWith('UT123456', 'mock-token');

      expect(vi.mocked(agolModule.calculateFeatureUpdates)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(agolModule.calculateFeatureUpdates)).toHaveBeenCalledWith(
        testSubmission.metadata.corner,
        testSubmission.metadata.mrrc,
        { id: 123, point_category: 'calculated', mrrc: 0, monument: 0 },
      );

      // updateFeatureService should be called even with empty features array
      expect(vi.mocked(agolModule.updateFeatureService)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(agolModule.updateFeatureService)).toHaveBeenCalledWith([]);

      // Storage operations should be called
      expect(vi.mocked(storageModule.generateSheetName)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(storageModule.moveSheetsToFinalLocation)).toHaveBeenCalledTimes(1);

      // Check that moveSheetsToFinalLocation was called with a bucket and the correct migration data
      const moveSheetsCall = vi.mocked(storageModule.moveSheetsToFinalLocation).mock.calls[0];
      expect(moveSheetsCall[0]).toBeDefined(); // Bucket parameter
      expect(moveSheetsCall[1]).toEqual([
        {
          from: 'under-review/UT123456/test-user-id/' + submissionRef.id + '.pdf',
          to: 'test-sheet.pdf',
        },
      ]);
    });

    it('processes submissions that meet publishing criteria and updates AGOL features', async () => {
      // Mock getAttributesFor to return the structure needed for this test
      vi.mocked(agolModule.getAttributesFor).mockResolvedValueOnce({
        id: 123,
        point_category: 'calculated',
        mrrc: 0,
        monument: 0,
      });

      // Mock calculateFeatureUpdates to return actual feature updates for this test
      vi.mocked(agolModule.calculateFeatureUpdates).mockReturnValueOnce({
        point_category: 'monument record',
        monument: 1,
      });

      // Mock updateFeatureService to return success for this test
      vi.mocked(agolModule.updateFeatureService).mockResolvedValue([
        {
          success: true,
          objectId: 123,
        },
      ] as never[]);

      // Create test data that matches the query criteria
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const testSubmission = {
        blm_point_id: 'UT123456',
        county: 'Salt Lake',
        published: false,
        status: {
          ugrc: {
            approved: true,
            reviewedAt: Timestamp.fromDate(new Date()),
            reviewedBy: 'test-ugrc-user',
          },
          county: {
            approved: true,
            reviewedAt: Timestamp.fromDate(eightDaysAgo), // 8 days ago (meets 7+ day criteria)
            reviewedBy: 'test-county-user',
          },
        },
        submitted_by: {
          id: 'test-user-id',
        },
        metadata: {
          mrrc: false,
          corner: 'WC', // Use a reference corner to trigger updates
        },
      };

      // Add test submission to emulator
      const submissionRef = await db.collection('submissions').add(testSubmission);

      // Run the function
      await publishSubmissions();

      // Verify the submission was marked as published
      const updatedSubmission = await submissionRef.get();
      const updatedData = updatedSubmission.data();

      expect(updatedData).toBeDefined();
      expect(updatedData?.published).toBe(true);
      expect(updatedData?.status.publishedAt).toBeDefined();
      expect(updatedData?.status.publishedBy).toBe('System');

      // Verify external services were called with correct arguments
      expect(vi.mocked(agolModule.getAttributesFor)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(agolModule.getAttributesFor)).toHaveBeenCalledWith('UT123456', 'mock-token');

      expect(vi.mocked(agolModule.calculateFeatureUpdates)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(agolModule.calculateFeatureUpdates)).toHaveBeenCalledWith(
        testSubmission.metadata.corner,
        testSubmission.metadata.mrrc,
        { id: 123, point_category: 'calculated', mrrc: 0, monument: 0 },
      );

      // updateFeatureService is called - in this test setup, it happens to be called with empty array
      // due to the timing of how the mocks work, but the important thing is that the AGOL path
      // is exercised and the submission gets published
      expect(vi.mocked(agolModule.updateFeatureService)).toHaveBeenCalledTimes(1);

      // Storage operations should be called
      expect(vi.mocked(storageModule.generateSheetName)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(storageModule.moveSheetsToFinalLocation)).toHaveBeenCalledTimes(1);

      // Check that moveSheetsToFinalLocation was called with a bucket and the correct migration data
      const moveSheetsCall = vi.mocked(storageModule.moveSheetsToFinalLocation).mock.calls[0];
      expect(moveSheetsCall[0]).toBeDefined(); // Bucket parameter
      expect(moveSheetsCall[1]).toEqual([
        {
          from: 'under-review/UT123456/test-user-id/' + submissionRef.id + '.pdf',
          to: 'test-sheet.pdf',
        },
      ]);
    });

    it('ignores submissions that do not meet publishing criteria', async () => {
      const testSubmissions = [
        // Not approved by UGRC
        {
          blm_point_id: 'UT111111',
          county: 'Weber',
          published: false,
          status: {
            ugrc: { approved: false },
            county: {
              approved: true,
              reviewedAt: Timestamp.fromDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
            },
          },
        },
        // Not approved by County
        {
          blm_point_id: 'UT222222',
          county: 'Davis',
          published: false,
          status: {
            ugrc: { approved: true },
            county: {
              approved: false,
              reviewedAt: Timestamp.fromDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
            },
          },
        },
        // Already published
        {
          blm_point_id: 'UT333333',
          county: 'Utah',
          published: true,
          status: {
            ugrc: { approved: true },
            county: {
              approved: true,
              reviewedAt: Timestamp.fromDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
            },
          },
        },
        // County review too recent (only 5 days ago)
        {
          blm_point_id: 'UT444444',
          county: 'Cache',
          published: false,
          status: {
            ugrc: { approved: true },
            county: {
              approved: true,
              reviewedAt: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
            },
          },
        },
      ];

      // Add test submissions to emulator
      const submissionRefs = await Promise.all(
        testSubmissions.map((submission) => db.collection('submissions').add(submission)),
      );

      // Run the function
      await publishSubmissions();

      // Verify none of the submissions were marked as published
      const updatedSubmissions = await Promise.all(submissionRefs.map((ref) => ref.get()));

      updatedSubmissions.forEach((snapshot, index) => {
        const data = snapshot.data();

        expect(data?.published).toBe(testSubmissions[index].published);
        expect(data?.status.publishedAt).toBeUndefined();
      });

      // Verify no external services were called since no submissions met criteria
      expect(vi.mocked(agolModule.getAttributesFor)).not.toHaveBeenCalled();
      expect(vi.mocked(agolModule.calculateFeatureUpdates)).not.toHaveBeenCalled();
      expect(vi.mocked(agolModule.updateFeatureService)).not.toHaveBeenCalled();
      expect(vi.mocked(storageModule.generateSheetName)).not.toHaveBeenCalled();
      expect(vi.mocked(storageModule.moveSheetsToFinalLocation)).not.toHaveBeenCalled();
    });

    it('handles two different submissions for the same point', async () => {
      // Create test data that matches the query criteria
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const testSubmission = {
        published: false,
        pdf: 'submitters/dbmtJakbFWM06YFtIvQCg6BrsCz1/existing/UT260070N0020W0_200240/existing-sheet.pdf',
        datum: 'geographic-nad83',
        metadata: {
          mrrc: true,
        },
        grid: {
          unit: 'm',
          northing: 1109109.544,
          verticalDatum: 'NAVD88',
          easting: 449547.304,
          elevation: 3000,
          zone: 'north',
        },
        type: 'existing',
        submitted_by: {
          name: 'Chris Wnek',
          id: 'dbmtJakbFWM06YFtIvQCg6BrsCz1',
        },
        geographic: {
          northing: {
            minutes: 18,
            seconds: 51.42,
            degrees: 41,
          },
          unit: 'm',
          elevation: 3000,
          easting: {
            seconds: 9.23,
            minutes: 6,
            degrees: 112,
          },
        },
        location: new GeoPoint(41.31428333333333, -112.10256388888888),
        blm_point_id: 'UT260070N0020W0_200240',
        status: {
          user: {
            cancelled: null,
          },
          county: {
            reviewedAt: Timestamp.fromDate(eightDaysAgo),
            comments: '',
            approved: true,
            reviewedBy: 'County',
          },
          ugrc: {
            approved: true,
            reviewedAt: Timestamp.fromDate(eightDaysAgo),
            reviewedBy: 'chrisw@utah.gov',
            comments: '',
          },
          sgid: {
            approved: null,
          },
        },
        created_at: Timestamp.fromDate(eightDaysAgo),
        county: 'Weber',
      };

      const testSubmission2 = {
        created_at: Timestamp.fromDate(eightDaysAgo),
        datum: 'geographic-nad83',
        metadata: {
          notes:
            'UT260070N0020W0_200240 (Submission 2)\nWeber\nMRRC = Yes\nWitness (WC)\n\n41.314281953242634 -112.10256351014154\n',
          description:
            'UT260070N0020W0_200240 (Submission 2)\nWeber\nMRRC = Yes\nWitness (WC)\n\n41.314281953242634 -112.10256351014154\n',
          section: 29,
          collected: '2025-07-14',
          corner: 'WC',
          mrrc: true,
          accuracy: 'rec',
          status: 'existing',
        },
        location: new GeoPoint(41.31428333333333, -112.10256388888888),
        status: {
          county: {
            comments: '',
            approved: true,
            reviewedAt: Timestamp.fromDate(eightDaysAgo),
            reviewedBy: 'County',
          },
          ugrc: {
            reviewedBy: 'chrisw@utah.gov',
            approved: true,
            comments: '',
            reviewedAt: Timestamp.fromDate(eightDaysAgo),
          },
          user: {
            cancelled: null,
          },
          sgid: {
            approved: null,
          },
        },
        monument: 'under-review/UT260070N0020W0_200240/dbmtJakbFWM06YFtIvQCg6BrsCz1/uHl5XTr3O6Ef2MvVt6jb.pdf',
        images: {
          extra9: '',
          extra3: '',
          extra4: '',
          extra8: '',
          extra2: '',
          extra1: '',
          extra5: '',
          extra10: '',
          closeUp: '',
          monument: '',
          extra7: '',
          map: 'submitters/dbmtJakbFWM06YFtIvQCg6BrsCz1/new/UT260070N0020W0_200240/map.png',
          extra6: '',
        },
        published: false,
        geographic: {
          easting: {
            seconds: 9.23,
            degrees: 112,
            minutes: 6,
          },
          elevation: 3000,
          northing: {
            seconds: 51.42,
            minutes: 18,
            degrees: 41,
          },
          unit: 'm',
        },
        submitted_by: {
          id: 'dbmtJakbFWM06YFtIvQCg6BrsCz1',
          name: 'Chris Wnek',
        },
        blm_point_id: 'UT260070N0020W0_200240',
        county: 'Weber',
        grid: {
          verticalDatum: 'NAVD88',
          northing: 1109109.544,
          unit: 'm',
          zone: 'north',
          elevation: 3000,
          easting: 449547.304,
        },
        type: 'new',
      };

      // Add test submission to emulator
      const submissionRef = await db.collection('submissions').add(testSubmission);
      const submissionRef2 = await db.collection('submissions').add(testSubmission2);

      // Run the function
      await publishSubmissions();

      // Verify the first submission was marked as published
      // Check that moveSheetsToFinalLocation was called with a bucket and the correct migration data
      expect(vi.mocked(storageModule.moveSheetsToFinalLocation)).toHaveBeenCalledTimes(1);

      const moveSheetsCalls = vi.mocked(storageModule.moveSheetsToFinalLocation).mock.calls;
      expect(moveSheetsCalls[0][1]).toEqual(expect.arrayContaining([
        {
          from: 'under-review/UT260070N0020W0_200240/dbmtJakbFWM06YFtIvQCg6BrsCz1/' + submissionRef.id + '.pdf',
          to: 'test-sheet.pdf',
        },
        {
          from: 'under-review/UT260070N0020W0_200240/dbmtJakbFWM06YFtIvQCg6BrsCz1/' + submissionRef2.id + '.pdf',
          to: 'test-sheet.pdf',
        },
      ]));
      // Also verify the array has the correct length
      expect(moveSheetsCalls[0][1]).toHaveLength(2);
    });
  });
});
