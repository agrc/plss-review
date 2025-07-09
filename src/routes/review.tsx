import Graphic from '@arcgis/core/Graphic';
import Viewpoint from '@arcgis/core/Viewpoint';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import * as geodeticLengthOperator from '@arcgis/core/geometry/operators/geodeticLengthOperator';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import TextSymbol from '@arcgis/core/symbols/TextSymbol';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  Button,
  Modal,
  Spinner,
  useFirebaseAuth,
  useFirebaseStorage,
  useFirestore,
} from '@ugrc/utah-design-system';
import { useMapReady } from '@ugrc/utilities/hooks';
import { doc, Firestore, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, type FirebaseStorage } from 'firebase/storage';
import ky from 'ky';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { MapContainer } from '../components/MapContainer';
import { ObjectPreview } from '../components/ObjectPreview';
import { RejectionReasons } from '../components/RejectionReasons';
import { ImageLoader } from '../components/TableLoader';
import { useMap } from '../components/hooks';
import type { Corner, FormValues } from '../components/shared/types';
import type { UgrcReview, UpdateDocumentParams } from '../types';

const getFirestoreDocument = async (id: string | undefined, firestore: Firestore, storage: FirebaseStorage) => {
  if (!id) {
    throw new Error('No submission ID provided');
  }

  const submissionRef = doc(firestore, 'submissions', id);
  const submissionDoc = await Spinner.minDelay(getDoc(submissionRef), 350);

  if (!submissionDoc.exists()) {
    throw new Error('Submission not found');
  }

  const submissionData = submissionDoc.data();

  if (!submissionData.blm_point_id) {
    throw new Error('BLM Point ID is missing in submission data');
  }

  const baseRef = ref(storage, 'under-review');
  const folderRef = ref(baseRef, submissionData.blm_point_id);
  const userRef = ref(folderRef, submissionData.submitted_by.id);
  const fileRef = ref(userRef, `${id}.pdf`);

  const pdf = await Spinner.minDelay(getDownloadURL(fileRef), 350);

  return {
    ...submissionData,
    pdf,
  } as Corner & { pdf: string };
};

const updateFirestoreDocument = async ({ id, approved, firestore, currentUser, comments }: UpdateDocumentParams) => {
  const submissionRef = doc(firestore, 'submissions', id);
  const submissionSnap = await getDoc(submissionRef);

  if (!submissionSnap.exists) {
    throw new Error('Submission not found');
  }

  const submissionData = submissionSnap.data();

  if (!submissionData) {
    throw new Error('Submission data is empty');
  }

  if (submissionData.status.ugrc.approved !== null) {
    throw new Error('Submission has already been reviewed');
  }

  const updates = {
    'status.ugrc.reviewedAt': DateTime.now().setZone('America/Denver').toJSDate(),
    'status.ugrc.reviewedBy': currentUser!.email!,
    'status.ugrc.approved': approved,
    'status.ugrc.comments': comments,
  } satisfies UgrcReview;

  await updateDoc(submissionRef, updates);
};

export default function Review() {
  const { storage } = useFirebaseStorage();
  const { firestore } = useFirestore();
  const { id, blm } = useParams();
  const { zoom, mapView, placeGraphic } = useMap();
  const ready = useMapReady(mapView);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useFirebaseAuth();
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      reason: 'missing-photo',
      notes: '',
    },
  });
  const [operatorLoaded, setOperatorLoaded] = useState<boolean>(geodeticLengthOperator.isLoaded());

  const { data, status: firestoreStatus } = useQuery({
    queryKey: ['firestore', id, firestore, storage],
    queryFn: () => getFirestoreDocument(id, firestore, storage),
    enabled: !!id,
  });

  const { mutate: updateStatus, status: mutateStatus } = useMutation({
    mutationFn: ({ approved, comments = '' }: { approved: boolean; comments?: string }) =>
      updateFirestoreDocument({
        id: id!,
        approved,
        firestore,
        currentUser,
        comments,
      }),
    onSuccess: async (_: unknown, variables: { approved: boolean; comments?: string }) => {
      await queryClient.invalidateQueries({
        queryKey: ['monuments', { type: 'received' }],
      });

      await queryClient.prefetchQuery({
        queryKey: ['monuments', { type: 'received' }],
      });

      if (variables.approved) {
        await queryClient.invalidateQueries({
          queryKey: ['monuments', { type: 'county' }],
        });

        await queryClient.prefetchQuery({
          queryKey: ['monuments', { type: 'county' }],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ['monuments', { type: 'rejected' }],
        });

        await queryClient.prefetchQuery({
          queryKey: ['monuments', { type: 'rejected' }],
        });
      }

      await navigate('/secure/received');
    },
  });

  const { data: featureSet, status: agolStatus } = useQuery<__esri.FeatureSet, Error>({
    queryKey: ['blm-point-location', blm],
    queryFn: () =>
      ky
        .get(
          'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahPLSSGCDBPoints/FeatureServer/0/query',
          {
            searchParams: {
              where: `pointId='${blm}'`,
              returnGeometry: true,
              outSR: 4326,
              f: 'json',
            },
          },
        )
        .json<__esri.FeatureSet>(),
    enabled: !!blm,
  });

  // Load the geodetic length operator
  useEffect(() => {
    if (!geodeticLengthOperator.isLoaded()) {
      geodeticLengthOperator.load().then(() => setOperatorLoaded(true));
    }
  }, []);

  // show points on the map
  useEffect(() => {
    if (
      ready &&
      agolStatus === 'success' &&
      firestoreStatus === 'success' &&
      featureSet?.features.length > 0 &&
      operatorLoaded
    ) {
      const feature = featureSet.features[0];
      if (!feature) {
        console.warn('No features found for blm point id');
        return;
      }

      const geometry = feature.geometry as __esri.Point;
      if (!geometry) {
        console.warn('No geometry found for blm point id');
        return;
      }

      if (!mapView) {
        console.warn('MapView is not set yet');
        return;
      }

      const blmPointIdGraphic = new Graphic({
        geometry: new Point({
          ...geometry,
          spatialReference: {
            wkid: 4326,
          },
        }),
        attributes: feature.attributes,
        symbol: new SimpleMarkerSymbol({
          color: '#2ecc40',
          size: '5px',
          outline: {
            color: 'white',
            width: 1,
          },
        }),
      });

      const submissionGraphic = new Graphic({
        geometry: new Point({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          spatialReference: { wkid: 4326 },
        }),
        attributes: feature.attributes,
        symbol: new SimpleMarkerSymbol({
          color: '#f012be',
          size: '10px',
          outline: {
            color: 'white',
            width: 1,
          },
        }),
      });

      const distanceGraphic = new Graphic({
        geometry: new Polyline({
          paths: [
            [
              [data.location.longitude, data.location.latitude],
              [geometry.x, geometry.y],
            ],
          ],
          spatialReference: { wkid: 4326 },
        }),
      });

      const distance = geodeticLengthOperator.execute(distanceGraphic.geometry!);
      let statusColor = 'white';
      if (distance <= 30) {
        statusColor = '#01ff70'; // green
      }
      if (distance > 50) {
        statusColor = '#ffdc00'; // yellow
      }
      if (distance > 75) {
        statusColor = '#ff851b'; // orange
      }
      if (distance > 100) {
        statusColor = '#ff4136'; // red
      }

      distanceGraphic.symbol = new SimpleLineSymbol({
        color: statusColor,
        width: 2,
        style: 'solid',
      });

      const textSymbol = new TextSymbol({
        text: `${distance.toFixed(2)}\nmeters`,
        color: 'black',
        haloColor: statusColor,
        haloSize: 2,
        font: {
          size: 20,
          family: 'sans-serif',
          weight: 'bold',
        },
        yoffset: 40,
      });

      const labelGraphic = new Graphic({
        geometry: blmPointIdGraphic.geometry,
        symbol: textSymbol,
      });

      placeGraphic([distanceGraphic, labelGraphic, blmPointIdGraphic, submissionGraphic]);

      zoom(
        new Viewpoint({
          targetGeometry: blmPointIdGraphic.geometry,
          scale: 1000,
        }),
      );
    }

    return () => {
      placeGraphic(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, featureSet, agolStatus, firestoreStatus, operatorLoaded]);

  const reject = (data: { reason: string; notes: string }) => {
    let comments = data.reason;
    if (data.notes) {
      comments += ` - ${data.notes}`;
    }

    updateStatus({ approved: false, comments });
  };

  return (
    <>
      <div className="absolute inset-0 grid size-full grid-cols-1 gap-2 overflow-y-hidden px-4 pb-2 md:grid-cols-[1fr_150px_1fr]">
        <div>
          {firestoreStatus === 'pending' ? (
            <ImageLoader animate={true} />
          ) : data?.pdf ? (
            <ObjectPreview url={data.pdf} />
          ) : (
            <p>⚠️ The document could not be loaded</p>
          )}
        </div>
        <div className="order-first flex flex-col items-center gap-2 md:order-none">
          {firestoreStatus === 'success' && data?.status.ugrc.reviewedBy === null && (
            <>
              <Button
                variant="primary"
                onPress={() => updateStatus({ approved: true })}
                isDisabled={firestoreStatus !== 'success'}
                isPending={mutateStatus === 'pending'}
              >
                Approve
              </Button>
              <DialogTrigger>
                <Button
                  variant="destructive"
                  onPress={() => {}}
                  isDisabled={firestoreStatus !== 'success'}
                  isPending={mutateStatus === 'pending'}
                >
                  Reject
                </Button>
                <Modal>
                  <AlertDialog
                    title="Reject submission"
                    variant="destructive"
                    actionLabel="Reject"
                    onAction={() => handleSubmit(reject)()}
                  >
                    <RejectionReasons control={control} />
                  </AlertDialog>
                </Modal>
              </DialogTrigger>
            </>
          )}
          <Button variant="secondary" onPress={() => navigate(-1)}>
            Back
          </Button>
        </div>
        <MapContainer />
      </div>
    </>
  );
}
