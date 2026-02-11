import * as admin from 'firebase-admin';
import { initializeFirebase } from './utils';

/**
 * Test a server-side query and report if it requires an index
 */
async function testQuery(name: string, query: admin.firestore.Query) {
  console.log(`\nTesting query: ${name}`);

  try {
    console.log('Executing query...');
    const snapshot = await query.get();

    console.log(`Query executed successfully. Found ${snapshot.size} documents.`);

    // Display some information about the results (if any)
    if (!snapshot.empty) {
      snapshot.docs.slice(0, 3).forEach((doc: FirebaseFirestore.QueryDocumentSnapshot, i: number) => {
        console.log(`Document ${i + 1}:`, doc.id);
      });

      if (snapshot.docs.length > 3) {
        console.log(`... and ${snapshot.docs.length - 3} more.`);
      }
    }

    return true;
  } catch (error) {
    // If the query requires an index, Firebase will throw a specific error
    if (error instanceof Error && error.message.includes('requires an index')) {
      console.error('This query requires an index. Error details:');
      console.error(error.message);

      // Firebase error messages typically include a URL to create the required index
      const indexUrlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/);
      if (indexUrlMatch) {
        console.log('Visit this URL to create the required index:');
        console.log(indexUrlMatch[0]);
      }
    } else {
      console.error('Unexpected error when testing query:');
      console.error(error);
    }

    return false;
  }
}

/**
 * Test all queries - both the collection group query and server-side versions of the client queries
 */
async function testAllQueries(): Promise<void> {
  try {
    // Initialize Firebase admin for server-side testing
    const { db } = initializeFirebase(['--project=ut-dts-agrc-plss-dev']);

    if (!db) {
      console.error('Failed to initialize Firestore');
      process.exit(1);
    }

    // Test user ID for collection group query
    const uid = '4E6ABUmhuqOpbdtNpZm1FQwlcFN2';

    // Test the collection group query (original user request)
    console.log('\n--- Testing collection group query ---');
    const collectionGroupQuery = db
      .collectionGroup('submissions')
      .where('submitted_by.id', '==', uid)
      .where('status.user.cancelled', '==', null);

    await testQuery('Collection Group Query (User Submissions)', collectionGroupQuery);

    // Test server-side equivalents of the client queries
    console.log('\n--- Testing server-side equivalents of client queries ---');

    // 1. Test equivalent of forNewSubmissions
    const newSubmissionsQuery = db
      .collection('submissions')
      .where('status.ugrc.approved', '==', null)
      .where('status.user.cancelled', '==', null)
      .orderBy('blm_point_id')
      .limit(25);

    await testQuery('New Submissions', newSubmissionsQuery);

    // 2. Test equivalent of forCountySubmissions
    const countySubmissionsQuery = db
      .collection('submissions')
      .where('status.ugrc.approved', '==', true)
      .where('status.county.approved', '==', null)
      .where('status.user.cancelled', '==', null)
      .orderBy('blm_point_id')
      .limit(25);

    await testQuery('County Submissions', countySubmissionsQuery);

    // 3. Test equivalent of forApprovedSubmissions
    const approvedSubmissionsQuery = db
      .collection('submissions')
      .where('status.ugrc.approved', '==', true)
      .where('status.county.approved', '==', true)
      .where('status.user.cancelled', '==', null)
      .orderBy('blm_point_id')
      .limit(25);

    await testQuery('Approved Submissions', approvedSubmissionsQuery);

    // 4. Test a rejected submissions query
    // Note: We cannot directly test the OR query on the server side
    // So we'll test each part separately

    console.log(
      '\nNote: Testing each rejected condition separately (OR conditions need separate queries in server-side)',
    );

    const rejectedByUgrcQuery = db
      .collection('submissions')
      .where('status.ugrc.approved', '==', false)
      .orderBy('blm_point_id')
      .limit(25);

    await testQuery('Rejected By UGRC', rejectedByUgrcQuery);

    const rejectedByCountyQuery = db
      .collection('submissions')
      .where('status.county.approved', '==', false)
      .orderBy('blm_point_id')
      .limit(25);

    await testQuery('Rejected By County', rejectedByCountyQuery);

    const cancelledByUserQuery = db
      .collection('submissions')
      .where('status.user.cancelled', '==', true)
      .orderBy('blm_point_id')
      .limit(25);

    await testQuery('Cancelled By User', cancelledByUserQuery);

    const getSubmissionsReadyForPublishing = db
      .collection('submissions')
      .where('status.ugrc.approved', '==', true)
      .where('status.county.approved', '==', true)
      .where('published', '==', false)
      .where('status.county.reviewedAt', '<=', '2020-01-01T00:00:00Z');

    await testQuery('Submissions Ready for Publishing', getSubmissionsReadyForPublishing);

    return Promise.resolve();
  } catch (error) {
    console.error('Error during query testing:', error);
    throw error;
  }
}

// Execute the test
testAllQueries()
  .then(() => {
    console.log('All tests completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.log('Tests failed');
    process.exit(1);
  });
