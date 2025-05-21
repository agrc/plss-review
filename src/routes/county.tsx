import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertDialog, Banner, Button, Modal, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { and, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useNavigate } from 'react-router';
import RejectionReasons from '../components/RejectionReasons';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { Submission } from '../components/shared/types';
import { asSubmission } from '../converters';

const columnHelper = createColumnHelper<Submission>();

export default function County() {
  const { firestore } = useFirestore();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

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
      columnHelper.accessor('actions', {
        id: 'actions',
        header: () => '',
        cell: () => {
          return (
            <div className="flex gap-1">
              <Button variant="secondary" size="small">
                Approve
              </Button>
              <Button variant="destructive" size="small" onPress={() => setDialogOpen(true)}>
                Reject
              </Button>
            </div>
          );
        },
      }),
    ],
    [setDialogOpen],
  );

  const { status, data, error } = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['monuments', { type: 'county' }],
    queryFn: async () => {
      const q = query(
        collection(firestore, 'submissions').withConverter(asSubmission),
        and(
          where('status.ugrc.approved', '==', true),
          where('status.county.approved', '==', null),
          where('status.user.cancelled', '==', null),
        ),
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
          navigate(`/secure/county/${row.original.blmPointId}/${row.original.id}`);
        }}
      />
      <DialogTrigger isOpen={dialogOpen}>
        <Modal>
          <AlertDialog
            title="Reject submission"
            variant="destructive"
            actionLabel="Reject"
            onAction={() => {
              setDialogOpen(false);
            }}
          >
            <RejectionReasons />
          </AlertDialog>
        </Modal>
      </DialogTrigger>
    </div>
  );
}
