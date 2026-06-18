import { describe, expect, it } from 'vitest';
import source from './rejected.tsx?raw';

describe('rejected.tsx', () => {
  it('includes row onClick navigation with blmPointId', () => {
    expect(source).toContain('onClick={(row) => {');
    expect(source).toContain('navigate(`/secure/received/${row.original.blmPointId}/${row.original.id}`);');
  });
});
