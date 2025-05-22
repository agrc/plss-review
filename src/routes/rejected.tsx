import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Banner, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { getDocs } from 'firebase/firestore';
import { useMemo } from 'react';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { RejectedSubmission } from '../components/shared/types';
import { forRejectedSubmissions } from './queries';

const columnHelper = createColumnHelper<RejectedSubmission>();

export default function Rejected() {
  const { firestore } = useFirestore();

  const columns = useMemo(
    () => [
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
        enableSorting: false,
      }),
      columnHelper.accessor('date', {
        id: 'date',
        header: () => 'Rejected Date',
        enableSorting: false,
      }),
      columnHelper.accessor('rejectedBy', {
        id: 'rejectedBy',
        header: () => 'Rejected by',
        enableSorting: false,
      }),
      columnHelper.accessor('reason', {
        id: 'reason',
        header: () => 'Reason',
        enableSorting: false,
      }),
    ],
    [],
  );

  const { status, data, error } = useQuery({
    queryKey: ['monuments', { type: 'rejected' }, firestore],
    queryFn: async () => {
      const snapshot = await Spinner.minDelay(getDocs(forRejectedSubmissions(firestore)));
      const items = snapshot.docs.map((doc) => doc.data());

      return items;
    },
    retry: 0,
    enabled: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (status === 'error') {
    console.error('Error querying firebase:', error);

    return (
      <div className="grid w-full justify-center justify-items-center gap-4">
        <h2>There was some trouble fetching rejected submissions.</h2>
        <Banner>
          <div className="whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</div>
        </Banner>
      </div>
    );
  }

  if (status === 'pending') {
    return <TableLoader animate={true} speed={2} />;
  }

  return (
    <div className="grid w-full gap-4 p-2">
      <Table
        data={data}
        columns={columns}
        emptyMessage="🙏🙏There are no rejected submissions. Everyone is doing a great job!🙏🙏"
      />
    </div>
  );
}
