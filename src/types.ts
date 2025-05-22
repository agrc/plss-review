import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export type CountyReview = {
  'status.county.reviewedAt': Date;
  'status.county.reviewedBy': string;
  'status.county.approved'?: boolean;
  'status.county.comments'?: string;
};

export type UpdateDocumentParams = {
  id: string;
  approved: boolean;
  firestore: Firestore;
  currentUser?: User;
  comments?: string;
};

export type UgrcReview = {
  'status.ugrc.reviewedAt': Date;
  'status.ugrc.reviewedBy': string;
  'status.ugrc.approved'?: boolean;
  'status.ugrc.comments'?: string;
};
