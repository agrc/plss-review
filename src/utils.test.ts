import { describe, expect, it } from 'vitest';
import { decrementCount, getFiscalYear } from './utils';

describe('utils', () => {
  it('returns the current fiscal year suffix before July', () => {
    expect(getFiscalYear(new Date('2026-06-30T12:00:00Z'))).toBe('26');
  });

  it('returns the next fiscal year suffix in July and later', () => {
    expect(getFiscalYear(new Date('2026-07-01T12:00:00Z'))).toBe('27');
  });

  it('decrements counts without going below zero', () => {
    expect(decrementCount(5)).toBe(4);
    expect(decrementCount(0)).toBe(0);
    expect(decrementCount()).toBeUndefined();
  });
});
