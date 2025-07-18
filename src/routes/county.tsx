import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertDialog, Banner, Button, Modal, Spinner, useFirestore } from '@ugrc/utah-design-system';
import { doc, getDoc, getDocs, runTransaction, Transaction, updateDoc } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { RejectionReasons } from '../components/RejectionReasons';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { FormValues, Submission } from '../components/shared/types';
import { forCountySubmissions } from '../queries';
import type { CountyReview, UpdateDocumentParams } from '../types';
import { getFiscalYear } from '../utils';

const columnHelper = createColumnHelper<Submission>();

const updateFirestoreDocument = async ({ id, approved, firestore, comments }: UpdateDocumentParams) => {
  const submissionRef = doc(firestore, 'submissions', id);
  const submissionSnap = await getDoc(submissionRef);

  if (!submissionSnap.exists) {
    throw new Error('Submission not found');
  }

  const submissionData = submissionSnap.data();

  if (!submissionData) {
    throw new Error('Submission data is empty');
  }

  if (submissionData.status.county.approved !== null) {
    throw new Error('Submission has already been reviewed');
  }

  const updates = {
    'status.county.reviewedAt': DateTime.now().setZone('America/Denver').toJSDate(),
    'status.county.reviewedBy': 'County',
    'status.county.approved': approved,
    'status.county.comments': comments,
  } satisfies CountyReview;

  await updateDoc(submissionRef, updates);

  if (approved && submissionData.metadata.mrrc) {
    const fiscalYear = getFiscalYear(new Date());
    const statsRef = doc(firestore, 'stats', `mrrc-${fiscalYear}`);
    const county = submissionData.county.toLowerCase().replace(/\s+/g, '-');

    await runTransaction(firestore, async (transaction: Transaction) => {
      const statsSnap = await transaction.get(statsRef);
      const statsData: Record<string, number> = statsSnap.exists() ? statsSnap.data() : {};

      statsData[county] = (statsData[county] ?? 0) + 1;

      transaction.set(statsRef, statsData, { merge: true });
    });
  }
};

export default function County() {
  const { firestore } = useFirestore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [activeRow, setActiveRow] = useState<string | null>();
  const [processingRow, setProcessingRow] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      reason: 'missing-photo',
      notes: '',
    },
  });

  const { mutate: updateStatus, status: mutateStatus } = useMutation({
    mutationFn: ({ id, approved, comments = '' }: { id?: string; approved: boolean; comments?: string }) => {
      const targetId = activeRow || id || '';
      setProcessingRow(targetId);
      return updateFirestoreDocument({
        id: targetId,
        approved,
        firestore,
        comments,
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['monuments', { type: 'county' }],
      });
      await queryClient.prefetchQuery({
        queryKey: ['monuments', { type: 'county' }],
      });

      if (variables.approved) {
        await queryClient.invalidateQueries({
          queryKey: ['firestore', 'submissions'],
        });
        await queryClient.invalidateQueries({
          queryKey: ['monuments', { type: 'approved' }],
        });
        await queryClient.prefetchQuery({
          queryKey: ['monuments', { type: 'approved' }],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ['monuments', { type: 'rejected' }],
        });
        await queryClient.prefetchQuery({
          queryKey: ['monuments', { type: 'rejected' }],
        });
        await queryClient.invalidateQueries({
          queryKey: ['firestore', 'submissions'],
        });
      }

      await navigate('/secure/received');
    },
    onError: (error) => {
      console.error('Error updating submission:', error);
    },
    onSettled: () => {
      setActiveRow(null);
      setProcessingRow(null);
    },
  });

  const { status, data, error } = useQuery({
    queryKey: ['monuments', { type: 'county' }, firestore],
    queryFn: async () => {
      const snapshot = await Spinner.minDelay(getDocs(forCountySubmissions(firestore)));
      const items = snapshot.docs.map((doc) => doc.data());

      return items;
    },
    retry: 0,
    enabled: true,
    staleTime: Infinity,
    gcTime: Infinity,
  });

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
        cell: (data) => {
          const isProcessing = processingRow === data.row.original.id;
          const isAnyProcessing = processingRow !== null;

          return (
            <div className="flex gap-1">
              <Button
                variant="primary"
                onPress={() => {
                  updateStatus({ id: data.row.original.id, approved: true });
                }}
                isDisabled={isAnyProcessing}
                isPending={isProcessing && mutateStatus === 'pending'}
                size="small"
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                size="small"
                onPress={() => {
                  setDialogOpen(true);
                  setActiveRow(data.row.original.id);
                }}
                isDisabled={isAnyProcessing}
              >
                Reject
              </Button>
            </div>
          );
        },
      }),
    ],
    [mutateStatus, updateStatus, processingRow],
  );

  if (status === 'error') {
    console.error('Error querying firebase:', error);

    return (
      <div className="grid w-full justify-center justify-items-center gap-4">
        <h2>There was some trouble fetching submissions awaiting county approval.</h2>
        <Banner>
          <div className="whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</div>
        </Banner>
      </div>
    );
  }

  if (status === 'pending') {
    return <TableLoader animate={true} speed={2} />;
  }

  const reject = (data: { reason: string; notes: string }) => {
    let comments = data.reason;
    if (data.notes) {
      comments += ` - ${data.notes}`;
    }

    updateStatus({ approved: false, comments });
  };

  return (
    <div className="grid w-full gap-4 p-2">
      <Table data={data} columns={columns} emptyMessage="⏳⏳There are no submissions waiting on the county.⏳⏳" />
      <DialogTrigger isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal>
          <AlertDialog
            title="Reject submission"
            variant="destructive"
            actionLabel="Reject"
            onAction={() => {
              setDialogOpen(false);
              handleSubmit(reject)();
            }}
          >
            <RejectionReasons control={control} />
          </AlertDialog>
        </Modal>
      </DialogTrigger>
    </div>
  );
}
