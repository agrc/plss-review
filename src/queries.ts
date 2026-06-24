import { and, collection, Firestore, or, orderBy, query, where } from 'firebase/firestore';
import { asApprovalSubmission, asCountySubmission, asNewSubmission, asRejectedSubmission } from './converters';

export const forNewSubmissions = (firestore: Firestore) =>
  query(
    collection(firestore, 'submissions').withConverter(asNewSubmission),
    and(where('status.ugrc.approved', '==', null), where('status.user.cancelled', '==', null)),
    orderBy('blm_point_id'),
  );

export const forCountySubmissions = (firestore: Firestore) =>
  query(
    collection(firestore, 'submissions').withConverter(asCountySubmission),
    and(
      where('status.ugrc.approved', '==', true),
      where('status.county.approved', '==', null),
      where('status.user.cancelled', '==', null),
    ),
    orderBy('blm_point_id'),
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
  );
