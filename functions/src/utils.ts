import { DateTime } from 'luxon';
import type { Status } from './types.js';

export function getMountainTimeFutureDate(daysInFuture: number): string {
  return DateTime.now().setZone('America/Denver').plus({ days: daysInFuture }).toFormat('yyyy-MM-dd');
}

export function determineStatusChange(
  before: { ugrc: Status; county: Status },
  after: { ugrc: Status; county: Status },
) {
  const { ugrc, county } = after;
  const { ugrc: beforeUgrc, county: beforeCounty } = before;

  if (beforeUgrc.approved === null && beforeUgrc.approved !== ugrc.approved) {
    return {
      status: 'UGRC Review',
      approved: ugrc.approved,
      reviewedBy: ugrc.reviewedBy,
      reviewedAt: ugrc.reviewedAt,
    };
  }

  if (beforeCounty.approved === null && beforeCounty.approved !== county.approved) {
    return {
      status: 'County Review',
      approved: county.approved,
      reviewedBy: county.reviewedBy,
      reviewedAt: county.reviewedAt,
    };
  }

  return null;
}
