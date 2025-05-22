import { and, collection, Firestore, limit, or, orderBy, query, where } from 'firebase/firestore';
import { asApprovalSubmission, asNewSubmission, asRejectedSubmission } from '../converters';

export const forNewSubmissions = (firestore: Firestore) =>
  query(
    collection(firestore, 'submissions').withConverter(asNewSubmission),
    and(where('status.ugrc.approved', '==', null), where('status.user.cancelled', '==', null)),
    orderBy('blm_point_id'),
    limit(25),
  );

export const forCountySubmissions = (firestore: Firestore) =>
  query(
    collection(firestore, 'submissions').withConverter(asNewSubmission),
    and(
      where('status.ugrc.approved', '==', true),
      where('status.county.approved', '==', null),
      where('status.user.cancelled', '==', null),
    ),
    orderBy('blm_point_id'),
    limit(25),
  );

export const forApprovedSubmissions = (firestore: Firestore) =>
  query(
    collection(firestore, 'submissions').withConverter(asApprovalSubmission),
    and(
      where('status.ugrc.approved', '==', true),
      where('status.county.approved', '==', true),
      where('status.user.cancelled', '==', null),
    ),
    orderBy('blm_point_id'),
    limit(25),
  );

export const forRejectedSubmissions = (firestore: Firestore) =>
  query(
    collection(firestore, 'submissions').withConverter(asRejectedSubmission),
    or(
      where('status.ugrc.approved', '==', false),
      where('status.county.approved', '==', false),
      where('status.user.cancelled', '==', true),
    ),
    orderBy('blm_point_id'),
    limit(25),
  );
