import type { Timestamp } from 'firebase-admin/firestore';
import type { Contact } from './emailHelper.js';

export type CountyReview = {
  'status.county.reviewedAt': Date;
  'status.county.reviewedBy': string;
  'status.county.approved'?: boolean;
};
export type Status = {
  approved: boolean | null;
  comments: string | null;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
};

export type SubmissionInCountyEvent = {
  type: 'submission-in-county';
  payload: {
    submissionId: string;
    blmPointId: string;
    county: string;
    monumentBucketPath: string;
    surveyor: Contact;
  };
};

export type SubmissionRejectedEvent = {
  type: 'submission-rejected';
  payload: {
    submissionId: string;
    blmPointId: string;
    county: string;
    surveyor: Contact;
  };
};

export type EmailEvent = SubmissionInCountyEvent | SubmissionRejectedEvent;
