import { Timestamp, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import type { Corner } from './components/shared/types';
import { asCountySubmission, asNewSubmission } from './converters';

const formatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const createCorner = (overrides?: Partial<Corner>): Corner => ({
  id: 'ignored-by-converter',
  blm_point_id: '123',
  county: 'utah',
  created_at: Timestamp.fromDate(new Date('2026-04-17T12:30:00.000Z')),
  datum: 'grid-nad83',
  geographic: {
    easting: { degrees: 0, minutes: 0, seconds: 0 },
    elevation: 0,
    northing: { degrees: 0, minutes: 0, seconds: 0 },
    unit: 'ft',
  },
  grid: {
    easting: 0,
    elevation: 0,
    northing: 0,
    unit: 'ft',
    verticalDatum: 'NAVD88',
    zone: 'north',
  },
  images: {
    closeUp: '',
    extra1: '',
    extra2: '',
    extra3: '',
    extra4: '',
    extra5: '',
    extra6: '',
    extra7: '',
    extra8: '',
    extra9: '',
    extra10: '',
    map: '',
    monument: '',
  },
  location: { latitude: 0, longitude: 0 } as Corner['location'],
  metadata: {
    accuracy: 'survey',
    collected: new Date('2026-04-17T12:30:00.000Z'),
    corner: 'NW',
    description: '',
    mrrc: true,
    notes: '',
    section: 1,
    status: 'existing',
  },
  monument: 'stone',
  status: {
    ugrc: {
      approved: true,
      comments: null,
      reviewedAt: Timestamp.fromDate(new Date('2026-04-18T13:45:00.000Z')),
      reviewedBy: 'reviewer',
    },
    county: {
      approved: null,
      comments: null,
      reviewedAt: null,
      reviewedBy: null,
    },
    sgid: {
      approved: null,
    },
    user: {
      cancelled: null,
    },
  },
  submitted_by: {
    id: 'submitter-1',
    name: 'A. Submitter',
    ref: 'users/submitter-1',
  },
  type: 'new',
  ...overrides,
});

const createSnapshot = (corner: Corner) =>
  ({
    id: 'submission-1',
    data: () => corner,
  }) as unknown as QueryDocumentSnapshot<Corner>;

describe('asCountySubmission', () => {
  it('maps the submission date and ugrc approved date', () => {
    const corner = createCorner();
    const result = asCountySubmission.fromFirestore(createSnapshot(corner), {} as SnapshotOptions);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'submission-1',
        date: formatter.format(corner.created_at.toDate()),
        ugrcApprovedDate: formatter.format(corner.status.ugrc.reviewedAt!.toDate()),
      }),
    );
  });

  it('falls back to Unknown when the ugrc reviewed timestamp is missing', () => {
    const corner = createCorner({
      status: {
        ...createCorner().status,
        ugrc: {
          ...createCorner().status.ugrc,
          reviewedAt: null,
        },
      },
    });

    const result = asCountySubmission.fromFirestore(createSnapshot(corner), {} as SnapshotOptions);

    expect(result.ugrcApprovedDate).toBe('Unknown');
  });
});

describe('asNewSubmission', () => {
  it('includes a reject reason when one exists', () => {
    const corner = createCorner({
      status: {
        ...createCorner().status,
        ugrc: {
          ...createCorner().status.ugrc,
          approved: false,
          comments: 'Needs more detail',
        },
      },
    });

    const result = asNewSubmission.fromFirestore(createSnapshot(corner), {} as SnapshotOptions);

    expect(result).toEqual(
      expect.objectContaining({
        rejectReason: 'Needs more detail',
      }),
    );
  });
});
