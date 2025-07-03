import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Banner, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { Submission } from '../components/shared/types';
import { forNewSubmissions } from '../queries';

const columnHelper = createColumnHelper<Submission>();
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
    enableSorting: false,
  }),
  columnHelper.accessor('date', {
    id: 'date',
    header: () => 'Submission Date',
    enableSorting: false,
  }),
  columnHelper.accessor('mrrc', {
    id: 'mrrc',
    header: () => 'MRRC',
    cell: (info) => {
      const value = info.getValue();
      if (value === undefined) {
        return 'Unknown';
      }

      return value ? 'Yep' : 'Nope';
    },
    enableSorting: false,
  }),
];

export default function Received() {
  const { firestore } = useFirestore();
  const navigate = useNavigate();

  const { status, data, error } = useQuery({
    queryKey: ['monuments', { type: 'received' }, firestore],
    queryFn: async () => {
      const snapshot = await Spinner.minDelay(getDocs(forNewSubmissions(firestore)));
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
        <h2>There was some trouble fetching new submissions.</h2>
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
        emptyMessage="☀️🌻There are no new submissions. Go play in the sun!🌻☀️"
        onClick={(row) => {
          navigate(`/secure/received/${row.original.blmPointId}/${row.original.id}`);
        }}
      />
    </div>
  );
}
