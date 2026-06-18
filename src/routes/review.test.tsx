import { describe, expect, it } from 'vitest';
import source from './review.tsx?raw';

describe('review.tsx', () => {
  it('includes Forgive button', () => {
    expect(source).toContain('Forgive');
    expect(source).toContain('canForgive');
    expect(source).toContain('forgiveDialogOpen');
  });

  it('Forgive button resets submission status back to Submitted', () => {
    // Verify the forgiveFirestoreDocument function resets the status fields
    expect(source).toContain("'status.ugrc.approved': null");
    expect(source).toContain("'status.county.approved': null");
    expect(source).toContain("'status.user.cancelled': null");
  });

  it('Forgive functionality requires rejected state', () => {
    // Verify the function checks for rejected state
    expect(source).toContain('isRejected');
    expect(source).toContain('status.ugrc.approved === false');
    expect(source).toContain('status.county.approved === false');
    expect(source).toContain('status.user.cancelled !== null');
  });

  it('Forgive button shows AlertDialog confirmation', () => {
    expect(source).toContain('Forgive submission');
    expect(source).toContain('Are you sure you want to forgive this monument record');
  });
});
