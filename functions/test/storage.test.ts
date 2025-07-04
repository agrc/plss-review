import { afterAll, describe, expect, it, test } from 'vitest';
import { generateSheetName, incrementName } from '../src/storage.js';

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

describe('generateSheetName', () => {
  // Use a fixed date for consistent testing (use local timezone to avoid UTC conversion issues)
  const testDate = new Date(2025, 0, 15); // January 15, 2025 in local timezone
  const standardBlmId = 'UT260390S0220E0_540600';

  // Core functionality tests with parameterized data
  test.each([
    [
      'should generate basic BLM point ID with date suffix',
      { referenceCorner: false, mrrc: false, blmPointId: standardBlmId, cornerType: undefined },
      `tiesheets/${standardBlmId}/${standardBlmId}_2025-01-15.pdf`,
    ],
    [
      'should generate with MRRC true only with date',
      { referenceCorner: false, mrrc: true, blmPointId: standardBlmId, cornerType: undefined },
      `tiesheets/${standardBlmId}/MRRC_${standardBlmId}_2025-01-15.pdf`,
    ],
    [
      'should generate with reference corner true but no corner type with date',
      { referenceCorner: true, mrrc: false, blmPointId: standardBlmId, cornerType: undefined },
      `tiesheets/${standardBlmId}/${standardBlmId}_2025-01-15.pdf`,
    ],
  ] as const)('%s', (description, input, expected) => {
    const result = generateSheetName({ ...input, today: testDate });
    expect(result).toBe(expected);
  });

  // Corner type tests
  describe('corner types', () => {
    test.each(['WC', 'MC', 'RC'])(
      'should generate with reference corner true and %s corner type with date',
      (cornerType) => {
        const result = generateSheetName({
          referenceCorner: true,
          mrrc: false,
          blmPointId: standardBlmId,
          cornerType,
          today: testDate,
        });
        expect(result).toBe(`tiesheets/${standardBlmId}/${cornerType}_${standardBlmId}_2025-01-15.pdf`);
      },
    );
  });

  // MRRC combination tests
  describe('MRRC combinations', () => {
    test.each([
      [
        'should generate with both reference corner and MRRC true with date',
        { referenceCorner: true, mrrc: true, blmPointId: standardBlmId, cornerType: 'WC' },
        `tiesheets/${standardBlmId}/MRRC_WC_${standardBlmId}_2025-01-15.pdf`,
      ],
    ] as const)('%s', (description, input, expected) => {
      const result = generateSheetName({ ...input, today: testDate });
      expect(result).toBe(expected);
    });

    // MRRC with different corner types (covers MC, RC)
    test.each(['MC', 'RC'])(
      'should generate with reference corner true, MRRC true, and %s corner with date',
      (cornerType) => {
        const result = generateSheetName({
          referenceCorner: true,
          mrrc: true,
          blmPointId: 'TEST123',
          cornerType,
          today: testDate,
        });
        expect(result).toBe(`tiesheets/TEST123/MRRC_${cornerType}_TEST123_2025-01-15.pdf`);
      },
    );
  });

  it('should generate consistent date format (YYYY-MM-DD)', () => {
    const today = new Date();
    const result = generateSheetName({
      referenceCorner: false,
      mrrc: false,
      blmPointId: 'TEST123',
      cornerType: undefined,
      today,
    });

    // Extract the date part from the result
    const dateMatch = result.match(/_(\d{4}-\d{2}-\d{2})\.pdf$/);
    expect(dateMatch).toBeTruthy();

    if (dateMatch) {
      const datePart = dateMatch[1];
      // Validate it's today's date in YYYY-MM-DD format
      const expectedDate = today
        .toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
      expect(datePart).toBe(expectedDate);
    }
  });

  // Edge cases and negative tests
  describe('edge cases and validation', () => {
    /**
     * Test handling of empty and invalid BLM point IDs
     */
    it('should handle empty BLM point ID', () => {
      const result = generateSheetName({
        referenceCorner: false,
        mrrc: false,
        blmPointId: '',
        cornerType: undefined,
        today: testDate,
      });
      expect(result).toBe('tiesheets//_2025-01-15.pdf');
    });

    /**
     * Test handling of special characters in BLM point ID
     */
    it('should handle special characters in BLM point ID', () => {
      const result = generateSheetName({
        referenceCorner: false,
        mrrc: false,
        blmPointId: 'UT_260400N@470E0#SN$01',
        cornerType: undefined,
        today: testDate,
      });
      expect(result).toBe('tiesheets/UT_260400N@470E0#SN$01/UT_260400N@470E0#SN$01_2025-01-15.pdf');
    });

    /**
     * Test handling of very long BLM point ID
     */
    it('should handle very long BLM point ID', () => {
      const longId = 'UT'.repeat(50) + '_VERY_LONG_POINT_ID_' + '123456789'.repeat(10);
      const result = generateSheetName({
        referenceCorner: false,
        mrrc: false,
        blmPointId: longId,
        cornerType: undefined,
        today: testDate,
      });
      expect(result).toBe(`tiesheets/${longId}/${longId}_2025-01-15.pdf`);
    });

    /**
     * Test handling of null/undefined corner type when reference corner is true
     */
    it('should handle null corner type with reference corner true', () => {
      const result = generateSheetName({
        referenceCorner: true,
        mrrc: false,
        blmPointId: 'UT123456',
        cornerType: null as unknown as string, // Testing edge case
        today: testDate,
      });
      expect(result).toBe('tiesheets/UT123456/UT123456_2025-01-15.pdf');
    });

    /**
     * Test handling of unusual corner types
     */
    it('should handle unusual corner type values', () => {
      const result = generateSheetName({
        referenceCorner: true,
        mrrc: false,
        blmPointId: 'UT123456',
        cornerType: 'CUSTOM_CORNER_TYPE',
        today: testDate,
      });
      expect(result).toBe('tiesheets/UT123456/UT123456_2025-01-15.pdf');
    });


    /**
     * Test complex combination scenarios
     */
    it('should handle complex combination with special characters', () => {
      const result = generateSheetName({
        referenceCorner: true,
        mrrc: true,
        blmPointId: 'UT-123_ABC.456',
        cornerType: 'WC-SPECIAL',
        today: testDate,
      });
      expect(result).toBe('tiesheets/UT-123_ABC.456/MRRC_UT-123_ABC.456_2025-01-15.pdf');
    });
  });
});

describe('incrementName', () => {
  // Basic functionality tests
  test.each([
    ['should add _1 to name without number suffix', 'MRRC_WC_UT260400N0470E0_SN_01.pdf', 'MRRC_WC_UT260400N0470E0_SN_01_1.pdf'],
    ['should increment existing number suffix', 'MRRC_WC_UT260400N0470E0_SN_01_1.pdf', 'MRRC_WC_UT260400N0470E0_SN_01_2.pdf'],
    ['should increment higher number suffix', 'MRRC_WC_UT260400N0470E0_SN_01_15.pdf', 'MRRC_WC_UT260400N0470E0_SN_01_16.pdf'],
    ['should increment with date', 'MRRC_WC_UT260400N0470E0_SN_2025-01-23.pdf', 'MRRC_WC_UT260400N0470E0_SN_2025-01-23_1.pdf'],
    ['should increment with date and counter', 'MRRC_WC_UT260400N0470E0_SN_2025-01-23_15.pdf', 'MRRC_WC_UT260400N0470E0_SN_2025-01-23_16.pdf'],
    ['should handle multi-digit numbers', 'test_999.pdf', 'test_1000.pdf'],
    ['should add _1 to simple filename', 'document.pdf', 'document_1.pdf'],
    ['should handle filename with underscores but no number suffix', 'my_file_name.pdf', 'my_file_name_1.pdf'],
    ['should handle zero as suffix', 'test_0.pdf', 'test_1.pdf'],
    ['should handle number in middle of filename (not suffix)', 'test_123_file.pdf', 'test_123_file_1.pdf'],
    ['should handle complex BLM point ID with number', 'tiesheets/UT260400N0470E0_SN_01/MRRC_WC_UT260400N0470E0_SN_01_3.pdf', 'tiesheets/UT260400N0470E0_SN_01/MRRC_WC_UT260400N0470E0_SN_01_4.pdf'],
  ] as const)('%s', (_, input, expected) => {
    const result = incrementName(input);
    expect(result).toBe(expected);
  });

  // Edge cases and validation
  describe('edge cases and validation', () => {
    test.each([
      ['should handle empty string gracefully', '', '_1'],
      ['should handle whitespace-only input', '   ', '_1'],
      ['should handle filename with only extension', '.txt', '.txt_1'],
      ['should handle very large numbers correctly', 'file_999999.pdf', 'file_999999_1.pdf'],
      ['should not increment numbers with leading zeros', 'file_001.pdf', 'file_001_1.pdf'],
      ['should not increment numbers greater than 999', 'file_1000.pdf', 'file_1000_1.pdf'],
      ['should handle multiple underscores and numbers', 'file_123_test_456.pdf', 'file_123_test_457.pdf'],
      ['should handle filenames with special characters', 'file@#$%^&*()_2.pdf', 'file@#$%^&*()_3.pdf'],
      ['should handle non-PDF files without extension', 'filename', 'filename_1'],
      ['should handle non-PDF files with extension', 'document.txt', 'document.txt_1'],
      ['should handle boundary case at 999', 'file_999.pdf', 'file_1000.pdf'],
      ['should not treat negative numbers as increments', 'file_-5.pdf', 'file_-5_1.pdf'],
      ['should handle path separators correctly', '/path/to/file_3.pdf', '/path/to/file_4.pdf'],
    ] as const)('%s', (_, input, expected) => {
      const result = incrementName(input);
      expect(result).toBe(expected);
    });

    // Test very long filenames separately due to dynamic generation
    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(200) + '_5.pdf';
      const expected = 'a'.repeat(200) + '_6.pdf';
      const result = incrementName(longName);
      expect(result).toBe(expected);
    });
  });
});
