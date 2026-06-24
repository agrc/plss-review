import type { QueryDocumentSnapshot, SnapshotOptions, Timestamp } from 'firebase/firestore';
import type { Corner, CountySubmission, RejectedSubmission, Submission } from './components/shared/types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const formatTimestamp = (timestamp: Timestamp | null | undefined, fallback = 'Unknown') => {
  if (!timestamp) {
    return fallback;
  }

  return dateFormatter.format(timestamp.toDate());
};

export const asNewSubmission = {
  toFirestore(): Corner {
    throw new Error('toFirestore is not implemented');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<Corner>, options: SnapshotOptions): Submission {
    const data = snapshot.data(options);

    let rejectReason: string | undefined;
    if (data.status.ugrc.approved === false) {
      rejectReason = data.status.ugrc.comments ?? undefined;
    } else if (data.status.county.approved === false) {
      rejectReason = data.status.county.comments ?? undefined;
    } else if (data.status.ugrc.comments) {
      // Previously rejected by UGRC but forgiven
      rejectReason = data.status.ugrc.comments;
    } else if (data.status.county.comments) {
      // Previously rejected by County but forgiven
      rejectReason = data.status.county.comments;
    }

    return {
      id: snapshot.id,
      blmPointId: data.blm_point_id,
      county: data.county,
      date: formatTimestamp(data.created_at, 'Unknown'),
      mrrc: data.metadata?.mrrc ?? undefined,
      submitter: data.submitted_by.name,
      rejectReason,
    };
  },
};

export const asCountySubmission = {
  toFirestore(): Corner {
    throw new Error('toFirestore is not implemented');
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<Corner>, options: SnapshotOptions): CountySubmission {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      blmPointId: data.blm_point_id,
      county: data.county,
      date: formatTimestamp(data.created_at, 'Unknown'),
      ugrcApprovedDate: formatTimestamp(data.status.ugrc.reviewedAt),
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

    return {
      id: snapshot.id,
      blmPointId: data.blm_point_id,
      county: data.county,
      date: formatTimestamp(data.status.county.reviewedAt),
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
        reviewedAt = formatTimestamp(data.status.ugrc.reviewedAt);
      }
    } else if (data.status.county.approved === false) {
      rejectedBy = data.status.county.reviewedBy ||= 'County';
      reason = data.status.county.comments ?? 'No reason provided';
      rejectedFrom = 'County';
      if (data.status.county.reviewedAt) {
        reviewedAt = formatTimestamp(data.status.county.reviewedAt);
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
