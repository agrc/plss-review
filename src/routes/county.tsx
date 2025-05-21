import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertDialog, Banner, Button, Modal, Spinner, useFirebaseAuth, useFirestore } from '@ugrc/utah-design-system';
import type { User } from 'firebase/auth';
import { and, collection, doc, Firestore, getDoc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { RejectionReasons, type FormValues } from '../components/RejectionReasons';
import Table from '../components/Table';
import { TableLoader } from '../components/TableLoader';
import type { Submission } from '../components/shared/types';
import { asSubmission } from '../converters';

type CountyReview = {
  'status.county.reviewedAt': Date;
  'status.county.reviewedBy': string;
  'status.county.approved'?: boolean;
  'status.county.comments'?: string;
};

type UpdateDocumentParams = {
  id: string;
  approved: boolean;
  firestore: Firestore;
  currentUser?: User;
  comments?: string;
};

const columnHelper = createColumnHelper<Submission>();

const updateFirestoreDocument = async ({ id, approved, firestore, currentUser, comments }: UpdateDocumentParams) => {
  const submissionRef = doc(firestore, 'submissions', id);
  const submissionSnap = await getDoc(submissionRef);

  if (!submissionSnap.exists) {
    console.log('throwing');
    throw new Error('Submission not found');
  }

  const submissionData = submissionSnap.data();

  if (!submissionData) {
    console.log('throwing');
    throw new Error('Submission data is empty');
  }

  if (submissionData.status.county.approved !== null) {
    console.log('throwing');
    throw new Error('Submission has already been reviewed');
  }

  const updates = {
    'status.county.reviewedAt': new Date(),
    'status.county.reviewedBy': currentUser!.email,
    'status.county.approved': approved,
  } as CountyReview;

  if (comments) {
    updates['status.county.comments'] = comments;
  }

  console.log('Updating submission', { id, updates });
  await updateDoc(submissionRef, updates);
};

export default function County() {
  const { firestore } = useFirestore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useFirebaseAuth();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [activeRow, setActiveRow] = useState<string | null>();
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      reason: 'missing-photo',
      notes: '',
    },
  });

  const { mutate: updateStatus, status: mutateStatus } = useMutation({
    mutationFn: ({ approved, comments = '' }: { approved: boolean; comments?: string }) => {
      console.log('Updating status', { activeRow, approved, comments });
      return updateFirestoreDocument({
        id: activeRow!,
        approved,
        firestore,
        currentUser,
        comments,
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['monuments', { type: 'county' }] });

      if (variables.approved) {
        await queryClient.invalidateQueries({ queryKey: ['monuments', { type: 'approved' }] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['monuments', { type: 'rejected' }] });
      }

      await navigate('/secure/received');
    },
  });

  const { status, data, error } = useQuery({
    queryKey: ['monuments', { type: 'county' }, firestore],
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
      await Spinner.minDelay(new Promise((resolve) => setTimeout(resolve, 1000)));
      // const snapshot = await Spinner.minDelay(getDocs(q));

      const snapshot = await getDocs(q);
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
          return (
            <div className="flex gap-1">
              <Button
                variant="primary"
                onPress={() => updateStatus({ approved: true })}
                isDisabled={mutateStatus !== 'success'}
                isPending={mutateStatus === 'pending'}
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
              >
                Reject
              </Button>
            </div>
          );
        },
      }),
    ],
    [mutateStatus, updateStatus],
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
    console.log('Rejecting submission', data);

    let comments = data.reason;
    if (data.notes) {
      comments += ` - ${data.notes}`;
    }

    updateStatus({ approved: false, comments });
  };

  return (
    <div className="grid w-full gap-4 p-2">
      <Table
        data={data}
        columns={columns}
        emptyMessage="⏳⏳There are no submissions waiting on the county.⏳⏳"
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
