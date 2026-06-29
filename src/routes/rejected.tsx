import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Banner, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { getDocs } from 'firebase/firestore';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { RejectedSubmission } from '../components/shared/types';
import { caseInsensitiveIncludesFilter, dateRangeFilter, useTableFilters } from '../hooks/useTableFilters';
import { forRejectedSubmissions } from '../queries';
import { dateStringSortingFn, localeStringSortingFn } from '../sortingFns';

const columnHelper = createColumnHelper<RejectedSubmission>();

export default function Rejected() {
  const { firestore } = useFirestore();
  const navigate = useNavigate();
  const { columnFilters, setColumnFilters, renderTextFilterControl, renderDateRangeFilterControl } = useTableFilters();

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
        filterFn: caseInsensitiveIncludesFilter,
        size: 215,
      }),
      columnHelper.accessor('county', {
        id: 'county',
        header: () => 'County',
        sortingFn: 'alphanumeric',
        filterFn: caseInsensitiveIncludesFilter,
        size: 160,
      }),
      columnHelper.accessor('submitter', {
        id: 'submitter',
        header: () => 'Submitter',
        sortingFn: 'alphanumeric',
        filterFn: caseInsensitiveIncludesFilter,
      }),
      columnHelper.accessor('date', {
        id: 'date',
        header: () => 'Rejected Date',
        sortingFn: dateStringSortingFn,
        filterFn: dateRangeFilter,
      }),
      columnHelper.accessor('rejectedFrom', {
        id: 'rejectedFrom',
        header: () => 'Rejected by',
        cell: (info) => <span aria-label={`Rejected by ${info.row.original.rejectedBy}`}>{info.getValue()}</span>,
        sortingFn: localeStringSortingFn,
      }),
      columnHelper.accessor('reason', {
        id: 'reason',
        header: () => 'Reason',
        sortingFn: 'alphanumeric',
        filterFn: caseInsensitiveIncludesFilter,
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
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        headerControls={{
          blmPointId: renderTextFilterControl('blmPointId'),
          county: renderTextFilterControl('county'),
          submitter: renderTextFilterControl('submitter'),
          date: renderDateRangeFilterControl(),
          rejectedFrom: renderTextFilterControl('rejectedFrom'),
          reason: renderTextFilterControl('reason'),
        }}
        emptyMessage="🙏🙏There are no rejected submissions. Everyone is doing a great job!🙏🙏"
        onClick={(row) => {
          navigate(`/secure/received/${row.original.blmPointId}/${row.original.id}`);
        }}
      />
    </div>
  );
}
