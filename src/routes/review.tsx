import Graphic from '@arcgis/core/Graphic';
import Viewpoint from '@arcgis/core/Viewpoint';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import * as geodeticLengthOperator from '@arcgis/core/geometry/operators/geodeticLengthOperator';
import { TextSymbol } from '@arcgis/core/symbols';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import { useQuery } from '@tanstack/react-query';
import { useFirebaseStorage, useFirestore } from '@ugrc/utah-design-system';
import { useMapReady } from '@ugrc/utilities/hooks';
import { doc, Firestore, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref, type FirebaseStorage } from 'firebase/storage';
import ky from 'ky';
import { useEffect } from 'react';
import { List } from 'react-content-loader';
import { useParams } from 'react-router';
import { MapContainer } from '../components/MapContainer';
import { ObjectPreview } from '../components/ObjectPreview';
import { useMap } from '../components/hooks';
import type { Corner } from '../components/shared/types';

const getFirestoreDocument = async (id: string | undefined, firestore: Firestore, storage: FirebaseStorage) => {
  if (!id) {
    throw new Error('No submission ID provided');
  }

  const submissionRef = doc(firestore, 'submissions', id);
  const submissionDoc = await getDoc(submissionRef);

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

  const pdf = await getDownloadURL(fileRef);

  return {
    ...submissionData,
    pdf,
  } as Corner & { pdf: string };
};

export default function Received() {
  const { storage } = useFirebaseStorage();
  const { firestore } = useFirestore();
  const { id, blm } = useParams();
  const { zoom, mapView, placeGraphic } = useMap();
  const ready = useMapReady(mapView);

  const { data, status: firestoreStatus } = useQuery({
    queryKey: ['firestore', id, firestore, storage],
    queryFn: () => getFirestoreDocument(id, firestore, storage),
    enabled: !!id,
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

  useEffect(() => {
    const processData = async () => {
      if (ready && agolStatus === 'success' && firestoreStatus === 'success' && featureSet?.features.length > 0) {
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

        if (!geodeticLengthOperator.isLoaded()) {
          await geodeticLengthOperator.load();
        }

        const distance = geodeticLengthOperator.execute(distanceGraphic.geometry!);
        let statusColor = 'white';
        if (distance <= 100) {
          statusColor = '#01ff70'; // green
        }
        if (distance > 100) {
          statusColor = '#ffdc00'; // yellow
        }
        if (distance > 250) {
          statusColor = '#ff851b'; // orange
        }
        if (distance > 1000) {
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
    };

    if (ready && agolStatus === 'success' && firestoreStatus === 'success' && featureSet?.features.length > 0) {
      processData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, featureSet, agolStatus]);

  return (
    <div className="absolute inset-0 grid size-full grid-cols-2 gap-10 overflow-y-hidden px-4 pb-2">
      <div>{firestoreStatus === 'pending' ? <List /> : data?.pdf ? <ObjectPreview url={data.pdf} /> : <List />}</div>
      <MapContainer />
    </div>
  );
}
