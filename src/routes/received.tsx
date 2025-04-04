import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Banner, useFirestore } from '@ugrc/utah-design-system';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { List } from 'react-content-loader';
import { useNavigate } from 'react-router';
import Table from '../components/Table';
import type { Submission } from '../components/shared/types';
import { asSubmission } from '../converters';

const columnHelper = createColumnHelper<Submission>();
const columns = [
  columnHelper.accessor('blmPointId', {
    id: 'blmPointId',
    header: () => 'BLM Point Id',
  }),
  columnHelper.accessor('county', {
    id: 'county',
    header: () => 'County',
  }),
  columnHelper.accessor('submitter', {
    id: 'submitter',
    header: () => 'Submitter',
  }),
  columnHelper.accessor('date', {
    id: 'date',
    header: () => 'Submission Date',
  }),
  columnHelper.accessor('mrrc', {
    id: 'mrrc',
    header: () => 'MRRC',
    cell: (info) => (info.getValue() ? 'Yes' : 'No'),
  }),
];

export default function Received() {
  const { firestore } = useFirestore();
  const navigate = useNavigate();
  const { isPending, isError, data, error } = useQuery({
    queryKey: ['received'],
    queryFn: async () => {
      const q = query(
        collection(firestore, 'submissions').withConverter(asSubmission),
        where('status.ugrc.approved', '==', null),
      );
      const snapshot = await getDocs(q);

      const items = snapshot.docs.map((doc) => doc.data());

      return items;
    },
    retry: 0,
    enabled: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (isError) {
    return (
      <div className="grid w-full justify-center justify-items-center gap-4">
        <h2>There was some trouble fetching new submissions.</h2>
        <Banner>
          <div className="whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</div>
        </Banner>
      </div>
    );
  }

  if (isPending) return <List />;

  return (
    <div className="grid w-full gap-4 p-2">
      <Table
        data={data}
        columns={columns}
        onClick={(row) => {
          console.log(row, 'row');
          navigate(`/secure/received/${row.original.blmPointId}`);
        }}
      />
    </div>
  );
}
