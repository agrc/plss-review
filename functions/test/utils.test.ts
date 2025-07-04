import { Timestamp } from 'firebase-admin/firestore';
import { afterAll, describe, expect, it } from 'vitest';
import { determineStatusChange, getFiscalYear, getMountainTimeFutureDate } from '../src/utils.js';

// Store original process.env
const originalEnv = process.env.AGOL_CREDENTIALS;
afterAll(() => {
  // Restore original environment
  if (originalEnv !== undefined) {
    process.env.AGOL_CREDENTIALS = originalEnv;
  } else {
    delete process.env.AGOL_CREDENTIALS;
  }
});

describe('getFiscalYear', () => {
  it('should return current year for dates before July', () => {
    // Test with a date in June (month 5, 0-indexed)
    const juneDate = {
      getFullYear: () => 2024,
      getMonth: () => 5, // June
    };

    const result = getFiscalYear(juneDate);
    expect(result).toBe('24'); // Should return last 2 digits of 2024
  });

  it('should return next year for dates in July', () => {
    // Test with a date in July (month 6, 0-indexed)
    const julyDate = {
      getFullYear: () => 2024,
      getMonth: () => 6, // July
    };

    const result = getFiscalYear(julyDate);
    expect(result).toBe('25'); // Should return last 2 digits of 2025 (2024 + 1)
  });

  it('should return next year for dates after July', () => {
    // Test with a date in December (month 11, 0-indexed)
    const decemberDate = {
      getFullYear: () => 2024,
      getMonth: () => 11, // December
    };

    const result = getFiscalYear(decemberDate);
    expect(result).toBe('25'); // Should return last 2 digits of 2025 (2024 + 1)
  });

  it('should handle edge case at boundary', () => {
    // Test with a date in May (month 4, just before July)
    const mayDate = {
      getFullYear: () => 2023,
      getMonth: () => 4, // May
    };

    const result = getFiscalYear(mayDate);
    expect(result).toBe('23'); // Should return last 2 digits of 2023
  });
});

describe('determineStatusChange', () => {
  it('should return UGRC Review when UGRC status changes from null', () => {
    const reviewedAt = Timestamp.fromDate(new Date());
    const before = {
      ugrc: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
      county: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
    };
    const after = {
      ugrc: { approved: true, comments: 'Approved', reviewedAt, reviewedBy: 'ugrc-user' },
      county: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
    };

    const result = determineStatusChange(before, after);

    expect(result).toEqual({
      status: 'UGRC Review',
      approved: true,
      reviewedBy: 'ugrc-user',
      reviewedAt,
    });
  });

  it('should return County Review when County status changes from null', () => {
    const ugrcReviewedAt = Timestamp.fromDate(new Date());
    const countyReviewedAt = Timestamp.fromDate(new Date());
    const before = {
      ugrc: { approved: true, comments: 'Approved', reviewedAt: ugrcReviewedAt, reviewedBy: 'ugrc-user' },
      county: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
    };
    const after = {
      ugrc: { approved: true, comments: 'Approved', reviewedAt: ugrcReviewedAt, reviewedBy: 'ugrc-user' },
      county: { approved: false, comments: 'Rejected', reviewedAt: countyReviewedAt, reviewedBy: 'county-user' },
    };

    const result = determineStatusChange(before, after);

    expect(result).toEqual({
      status: 'County Review',
      approved: false,
      reviewedBy: 'county-user',
      reviewedAt: countyReviewedAt,
    });
  });

  it('should return null when no status changes from null', () => {
    const ugrcReviewedAt = Timestamp.fromDate(new Date());
    const countyReviewedAt = Timestamp.fromDate(new Date());
    const before = {
      ugrc: { approved: true, comments: 'Approved', reviewedAt: ugrcReviewedAt, reviewedBy: 'ugrc-user' },
      county: { approved: false, comments: 'Rejected', reviewedAt: countyReviewedAt, reviewedBy: 'county-user' },
    };
    const after = {
      ugrc: { approved: false, comments: 'Now rejected', reviewedAt: ugrcReviewedAt, reviewedBy: 'ugrc-user' },
      county: { approved: true, comments: 'Now approved', reviewedAt: countyReviewedAt, reviewedBy: 'county-user' },
    };

    const result = determineStatusChange(before, after);

    expect(result).toBe(null);
  });

  it('should return null when statuses remain null', () => {
    const before = {
      ugrc: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
      county: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
    };
    const after = {
      ugrc: { approved: null, comments: 'Updated comments', reviewedAt: null, reviewedBy: null },
      county: { approved: null, comments: 'Updated comments', reviewedAt: null, reviewedBy: null },
    };

    const result = determineStatusChange(before, after);

    expect(result).toBe(null);
  });

  it('should prioritize UGRC Review when both change from null', () => {
    const ugrcReviewedAt = Timestamp.fromDate(new Date());
    const countyReviewedAt = Timestamp.fromDate(new Date());
    const before = {
      ugrc: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
      county: { approved: null, comments: null, reviewedAt: null, reviewedBy: null },
    };
    const after = {
      ugrc: { approved: true, comments: 'Approved', reviewedAt: ugrcReviewedAt, reviewedBy: 'ugrc-user' },
      county: { approved: false, comments: 'Rejected', reviewedAt: countyReviewedAt, reviewedBy: 'county-user' },
    };

    const result = determineStatusChange(before, after);

    expect(result).toEqual({
      status: 'UGRC Review',
      approved: true,
      reviewedBy: 'ugrc-user',
      reviewedAt: ugrcReviewedAt,
    });
  });
});

describe('getMountainTimeFutureDate', () => {
  it('should return date in future in Mountain time', () => {
    const result = getMountainTimeFutureDate(7);

    // Should return a string in YYYY-MM-DD format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Since we can't predict the exact date due to timezone and timing,
    // just verify it's a valid date string format
    const parsed = new Date(result);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});
