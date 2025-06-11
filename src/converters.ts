import type { QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';
import type { Corner, RejectedSubmission, Submission } from './components/shared/types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

export const asNewSubmission = {
  toFirestore(): Corner {
    throw new Error('toFirestore is not implemented');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<Corner>, options: SnapshotOptions): Submission {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      blmPointId: data.blm_point_id,
      county: data.county,
      date: dateFormatter.format(Date.parse(data.created_at.toDate().toISOString())),
      mrrc: data.metadata?.mrrc ?? undefined,
      submitter: data.submitted_by.name,
    };
  },
};

export const asApprovalSubmission = {
  toFirestore(): Corner {
    throw new Error('toFirestore is not implemented');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<Corner>, options: SnapshotOptions): Submission {
    const data = snapshot.data(options);
    let date = null;

    if (data.status.county.reviewedAt) {
      date = dateFormatter.format(Date.parse(data.status.county.reviewedAt.toDate().toISOString()));
    }

    return {
      id: snapshot.id,
      blmPointId: data.blm_point_id,
      county: data.county,
      date: date ?? 'Unknown',
      mrrc: data.metadata?.mrrc ?? undefined,
      submitter: data.submitted_by.name,
    };
  },
};

export const asRejectedSubmission = {
  toFirestore(): Corner {
    throw new Error('toFirestore is not implemented');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<Corner>, options: SnapshotOptions): RejectedSubmission {
    const data = snapshot.data(options);

    let rejectedBy = '';
    let rejectedFrom: 'User' | 'County' | 'UGRC' = 'User';
    let reason = 'No reason provided';
    let reviewedAt = null;

    if (data.status.user.cancelled) {
      rejectedBy = 'User';
    } else if (data.status.ugrc.approved === false) {
      rejectedBy = data.status.ugrc.reviewedBy ||= 'UGRC';
      reason = data.status.ugrc.comments ?? 'No reason provided';
      rejectedFrom = 'UGRC';
      if (data.status.ugrc.reviewedAt) {
        reviewedAt = dateFormatter.format(Date.parse(data.status.ugrc.reviewedAt.toDate().toISOString()));
      }
    } else if (data.status.county.approved === false) {
      rejectedBy = data.status.county.reviewedBy ||= 'County';
      reason = data.status.county.comments ?? 'No reason provided';
      rejectedFrom = 'County';
      if (data.status.county.reviewedAt) {
        reviewedAt = dateFormatter.format(Date.parse(data.status.county.reviewedAt.toDate().toISOString()));
      }
    }

    return {
      id: snapshot.id,
      blmPointId: data.blm_point_id,
      county: data.county,
      rejectedBy,
      rejectedFrom,
      reason,
      date: reviewedAt ?? 'Unknown',
      submitter: data.submitted_by.name,
    };
  },
};
