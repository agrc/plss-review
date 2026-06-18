import { describe, expect, it } from 'vitest';
import source from './received.tsx?raw';

describe('received.tsx', () => {
  it('includes rejectReason column', () => {
    expect(source).toContain("columnHelper.accessor('rejectReason', {");
    expect(source).toContain("header: () => 'Reject Reason',");
  });
});
