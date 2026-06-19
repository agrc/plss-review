import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Banner, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { Submission } from '../components/shared/types';
import { caseInsensitiveIncludesFilter, dateRangeFilter, mrrcFilter, useTableFilters } from '../hooks/useTableFilters';
import { forNewSubmissions } from '../queries';
import { dateStringSortingFn, mrrcCellText, nullableBooleanSortingFn } from '../sortingFns';

const columnHelper = createColumnHelper<Submission>();
const BLM_POINT_ID_COLUMN_WIDTH = 215;
const COUNTY_COLUMN_WIDTH = 160;

const MRRC_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Yep', value: 'yep' },
  { label: 'Nope', value: 'nope' },
  { label: 'Unknown', value: 'unknown' },
];

const columns = [
  columnHelper.accessor('id', {
    id: 'id',
    header: () => null,
    size: 0,
    minSize: 0,
    maxSize: 0,
  }),
  columnHelper.accessor('blmPointId', {
    id: 'blmPointId',
    header: () => 'BLM Point Id',
    sortingFn: 'alphanumeric',
    filterFn: caseInsensitiveIncludesFilter,
    size: BLM_POINT_ID_COLUMN_WIDTH,
  }),
  columnHelper.accessor('county', {
    id: 'county',
    header: () => 'County',
    sortingFn: 'alphanumeric',
    filterFn: caseInsensitiveIncludesFilter,
    size: COUNTY_COLUMN_WIDTH,
  }),
  columnHelper.accessor('submitter', {
    id: 'submitter',
    header: () => 'Submitter',
    sortingFn: 'alphanumeric',
    filterFn: caseInsensitiveIncludesFilter,
  }),
  columnHelper.accessor('date', {
    id: 'date',
    header: () => 'Submission Date',
    sortingFn: dateStringSortingFn,
    filterFn: dateRangeFilter,
  }),
  columnHelper.accessor('mrrc', {
    id: 'mrrc',
    header: () => 'MRRC',
    cell: (info) => mrrcCellText(info.getValue()),
    sortingFn: nullableBooleanSortingFn,
    filterFn: mrrcFilter,
  }),
  columnHelper.accessor('rejectReason', {
    id: 'rejectReason',
    header: () => 'Reject Reason',
    sortingFn: 'alphanumeric',
    filterFn: caseInsensitiveIncludesFilter,
  }),
];

export default function Received() {
  const { firestore } = useFirestore();
  const navigate = useNavigate();
  const {
    columnFilters,
    setColumnFilters,
    renderTextFilterControl,
    renderSelectFilterControl,
    renderDateRangeFilterControl,
  } = useTableFilters();

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
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        headerControls={{
          blmPointId: renderTextFilterControl('blmPointId'),
          county: renderTextFilterControl('county'),
          submitter: renderTextFilterControl('submitter'),
          date: renderDateRangeFilterControl(),
          mrrc: renderSelectFilterControl('mrrc', MRRC_FILTER_OPTIONS, 'Filter MRRC'),
          rejectReason: renderTextFilterControl('rejectReason'),
        }}
        emptyMessage="☀️🌻There are no new submissions. Go play in the sun!🌻☀️"
        onClick={(row) => {
          navigate(`/secure/received/${row.original.blmPointId}/${row.original.id}`);
        }}
      />
    </div>
  );
}
