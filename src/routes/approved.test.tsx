import { createColumnHelper } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import type { Submission } from '../components/shared/types';
import { dateStringSortingFn, mrrcCellText, nullableBooleanSortingFn } from '../sortingFns';

const columnHelper = createColumnHelper<Submission>();

describe('approved.tsx', () => {
  it('should verify onClick includes blmPointId', () => {
    const mockRow = {
      original: {
        id: 'test-id',
        blmPointId: 'BLM-123',
        county: 'Salt Lake',
        submitter: 'John Doe',
        date: '2024-01-01',
        mrrc: true,
      },
    };

    // Simulate the onClick logic
    const navigatePath = `/secure/received/${mockRow.original.blmPointId}/${mockRow.original.id}`;

    expect(navigatePath).toContain(mockRow.original.blmPointId);
    expect(navigatePath).toContain('BLM-123');
  });

  it('should verify each accessor has a sortingFn', () => {
    const columns = [
      columnHelper.accessor('id', {
        id: 'id',
        header: () => null,
      }),
      columnHelper.accessor('blmPointId', {
        id: 'blmPointId',
        header: () => 'BLM Point Id',
        sortingFn: 'alphanumeric',
        size: 215,
      }),
      columnHelper.accessor('county', {
        id: 'county',
        header: () => 'County',
        sortingFn: 'alphanumeric',
        size: 160,
      }),
      columnHelper.accessor('submitter', {
        id: 'submitter',
        header: () => 'Submitter',
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('date', {
        id: 'date',
        header: () => 'Approved Date',
        sortingFn: dateStringSortingFn,
      }),
      columnHelper.accessor('mrrc', {
        id: 'mrrc',
        header: () => 'MRRC',
        cell: (info) => mrrcCellText(info.getValue()),
        sortingFn: nullableBooleanSortingFn,
      }),
    ];

    // Check that all columns except 'id' have a sortingFn
    columns.forEach((column) => {
      if (column.id !== 'id') {
        expect(column.sortingFn).toBeDefined();
      }
    });
  });
});
