import type { QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';
import type { Corner, Submission } from './components/shared/types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  timeZone: 'MST',
});

export const asSubmission = {
  toFirestore(): Corner {
    throw new Error('toFirestore is not implemented');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<Corner>, options: SnapshotOptions): Submission {
    const data = snapshot.data(options);

    return {
      blmPointId: data.blm_point_id,
      county: data.county,
      date: dateFormatter.format(Date.parse(data.created_at.toDate().toISOString())),
      mrrc: data.metadata?.mrrc ?? undefined,
      submitter: data.submitted_by.name,
    };
  },
};
