import { afterAll, describe, expect, it } from 'vitest';
import { calculateFeatureUpdates, getAGOLToken } from '../src/agol.js';

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

describe('calculateFeatureUpdates', () => {
  it('should not update when values are maxed out', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: 1,
      monument: 1,
    };

    const result = calculateFeatureUpdates('corner', true, attributes);

    expect(result).toEqual({});
  });

  it('should update monument flag when not set and category is not a reference corner', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: 1,
      monument: 0,
    };

    const result = calculateFeatureUpdates('corner', true, attributes);

    expect(result).toEqual({ monument: 1 });
  });

  it('should update mrrc when submission has mrrc true', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: 0,
      monument: 1,
    };

    const result = calculateFeatureUpdates('corner', true, attributes);

    expect(result).toEqual({ mrrc: 1 });
  });

  it('should keep mrrc as 1 when submission has mrrc false', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: 1,
      monument: 1,
    };

    const result = calculateFeatureUpdates('corner', false, attributes);

    expect(result).toEqual({});
  });

  it('should update point_category for WC corner', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: 0,
      monument: 1,
    };

    const result = calculateFeatureUpdates('WC', false, attributes);

    expect(result).toEqual({ point_category: 'Reference Corner' });
  });

  it('should update point_category for MC corner', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: 0,
      monument: 1,
    };

    const result = calculateFeatureUpdates('MC', false, attributes);

    expect(result).toEqual({ point_category: 'Reference Corner' });
  });

  it('should update point_category for RC corner', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: 0,
      monument: 1,
    };

    const result = calculateFeatureUpdates('RC', false, attributes);

    expect(result).toEqual({ point_category: 'Reference Corner' });
  });

  it('should handle undefined corner and mrrc', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: 0,
      monument: 0,
    };

    const result = calculateFeatureUpdates(undefined, undefined, attributes);

    expect(result).toEqual({});
  });

  it('should handle multiple updates needed', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: 0,
      monument: 0,
    };

    const result = calculateFeatureUpdates('WC', true, attributes);

    expect(result).toEqual({
      point_category: 'Reference Corner',
      mrrc: 1,
    });
  });

  it('should calculate null values correctly', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: null,
      monument: null,
    };

    const result = calculateFeatureUpdates('WC', true, attributes);

    expect(result).toEqual({
      point_category: 'Reference Corner',
      mrrc: 1,
      monument: 0,
    });
  });

  it('should update point_category to monument record for non-reference corner', () => {
    const attributes = {
      point_category: 'Calculated', // Not 'Monument Record'
      mrrc: 1,
      monument: 1,
    };

    // Use a non-reference corner that's not undefined
    const result = calculateFeatureUpdates('some-corner', false, attributes);

    expect(result).toEqual({
      point_category: 'Monument Record',
    });
  });

  it('should update monument to 0 for reference corner when monument is not 0', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: 1,
      monument: 2, // Use a value that's neither 0 nor 1 to trigger the condition
    };

    const result = calculateFeatureUpdates('WC', false, attributes);

    expect(result).toEqual({
      monument: 0,
    });
  });

  it('should update null mrrc when submission has mrrc true', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: null,
      monument: 1,
    };

    const result = calculateFeatureUpdates('corner', true, attributes);

    expect(result).toEqual({ mrrc: 1 });
  });

  it('should update null monument to 1 for non-reference corner', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: 1,
      monument: null,
    };

    const result = calculateFeatureUpdates('corner', true, attributes);

    expect(result).toEqual({ monument: 1 });
  });

  it('should update null monument to 0 for reference corner', () => {
    const attributes = {
      point_category: 'Monument Record',
      mrrc: 1,
      monument: null,
    };

    const result = calculateFeatureUpdates('WC', false, attributes);

    expect(result).toEqual({ monument: 0 });
  });

  it('should handle null values on non-reference corner with mrrc false', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: null,
      monument: null,
    };

    const result = calculateFeatureUpdates('corner', false, attributes);

    expect(result).toEqual({
      point_category: 'Monument Record',
      monument: 1,
    });
  });

  it('should handle null values with undefined corner should not update monument', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: null,
      monument: null,
    };

    const result = calculateFeatureUpdates(undefined, true, attributes);

    expect(result).toEqual({
      mrrc: 1, // mrrc is still updated when mrrc=true, regardless of corner value
    });
  });

  it('should handle null values with undefined corner and mrrc false should not update anything', () => {
    const attributes = {
      point_category: 'Calculated',
      mrrc: null,
      monument: null,
    };

    const result = calculateFeatureUpdates(undefined, false, attributes);

    expect(result).toEqual({});
  });
});

describe('getAGOLToken', () => {
  it('should throw error when credentials are not configured', async () => {
    // Clear environment variable
    delete process.env.AGOL_CREDENTIALS;

    await expect(getAGOLToken()).rejects.toThrow('AGOL credentials not configured');
  });

  it('should throw error when username is missing', async () => {
    // Set empty password
    process.env.AGOL_CREDENTIALS = '';

    await expect(getAGOLToken()).rejects.toThrow('AGOL credentials not configured');
  });

  it('should throw error when password is missing', async () => {
    // Delete environment variable entirely
    delete process.env.AGOL_CREDENTIALS;

    await expect(getAGOLToken()).rejects.toThrow('AGOL credentials not configured');
  });

  it('should return token on successful request', async () => {
    // Set valid password
    process.env.AGOL_CREDENTIALS = 'test-password';

    // Mock successful ky response
    const originalKy = await import('ky');
    const mockPost = {
      json: async () => ({ token: 'test-token-12345', expires: 3600, ssl: true }),
    };

    // Temporarily replace ky.post
    const originalPostMethod = originalKy.default.post;
    (originalKy.default as unknown as { post: unknown }).post = () => mockPost;

    try {
      const token = await getAGOLToken();
      expect(token).toBe('test-token-12345');
    } finally {
      // Restore original method
      (originalKy.default as unknown as { post: unknown }).post = originalPostMethod;
    }
  });

  it('should throw error when token is missing from response', async () => {
    // Set valid password
    process.env.AGOL_CREDENTIALS = 'test-password';

    // Mock ky response without token
    const originalKy = await import('ky');
    const mockPost = {
      json: async () => ({ expires: 3600, ssl: true }), // Missing token
    };

    // Temporarily replace ky.post
    const originalPostMethod = originalKy.default.post;
    (originalKy.default as unknown as { post: unknown }).post = () => mockPost;

    try {
      await expect(getAGOLToken()).rejects.toThrow('Failed to authenticate with AGOL');
    } finally {
      // Restore original method
      (originalKy.default as unknown as { post: unknown }).post = originalPostMethod;
    }
  });
});
