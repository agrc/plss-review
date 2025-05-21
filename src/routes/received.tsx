import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Banner, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { and, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { Submission } from '../components/shared/types';
import { asSubmission } from '../converters';

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
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['monuments', { type: 'received' }],
    queryFn: async () => {
      const q = query(
        collection(firestore, 'submissions').withConverter(asSubmission),
        and(where('status.ugrc.approved', '==', null), where('status.user.cancelled', '==', null)),
        orderBy('blm_point_id'),
      );
      const snapshot = await Spinner.minDelay(getDocs(q));

      const items = snapshot.docs.map((doc) => doc.data());

      return items;
    },
    retry: 0,
    enabled: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (status === 'error') {
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
        onClick={(row) => {
          navigate(`/secure/received/${row.original.blmPointId}/${row.original.id}`);
        }}
      />
    </div>
  );
}
