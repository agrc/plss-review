import { describe, expect, it } from 'vitest';
import { formatReceivedTabLabel, getTabRoutes } from './tabRoutes';

describe('tabRoutes', () => {
  it('formats the received tab label with a count when available', () => {
    expect(formatReceivedTabLabel(805)).toBe('Received (805)');
  });

  it('keeps the received tab label unchanged until the count is available', () => {
    expect(formatReceivedTabLabel()).toBe('Received');
  });

  it('only applies the count to the received tab', () => {
    expect(getTabRoutes(805).map((tab) => tab.label)).toEqual([
      'Received (805)',
      'Under County Review',
      'County Approved',
      'Rejected',
    ]);
  });
});
