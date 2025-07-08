import { type Firestore, Timestamp } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';

const wait = process.env.GCLOUD_PROJECT?.includes('dev') ? { minutes: 1 } : { days: 7 };

/**
 * Query for submissions that are ready to be published
 * Criteria:
 * - approved by status.ugrc.approved = true and status.county.approved = true
 * - status.county.reviewedAt + 7 days has passed
 * - published = false
 */
export async function getSubmissionsReadyForPublishing(db: Firestore) {
  const scheduled = DateTime.now().minus(wait);

  const query = db
    .collection('submissions')
    .where('status.ugrc.approved', '==', true)
    .where('status.county.approved', '==', true)
    .where('published', '==', false)
    .where('status.county.reviewedAt', '<=', Timestamp.fromDate(scheduled.toJSDate()));

  return await query.get();
}
