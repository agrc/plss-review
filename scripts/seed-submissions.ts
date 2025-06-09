import { GeoPoint } from 'firebase/firestore';
import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

db.collection('submissions').add({
  blm_point_id: 'UT260030S0060W0_100300',
  created_at: new Date(),
  county: 'Beaver',
  type: 'existing',
  metadata: {
    pdf: 'submitters/uid/existing/point_id/existing-sheet.pdf',
    mrrc: true,
  },
  location: new GeoPoint(40.53367418800078, -112.57784149142446),
  pdf: 'under-review/UT260030S0060W0_100300/Y0D4o9od4ojHpGaL9gg6uK3dgNuK/tZxbXE1cLKk8rAgvCVcC.pdf',
  datum: 'geographic-nad83',
  submitted_by: {
    id: 'Y0D4o9od4ojHpGaL9gg6uK3dgNuK',
    name: 'Raccoon Peach',
    ref: 'submitters/Y0D4o9od4ojHpGaL9gg6uK3dgNuK',
  },
  geographic: {
    northing: { seconds: 10, minutes: 14, degrees: 41 },
    easting: { seconds: 29, minutes: 14, degrees: 111 },
    unit: 'm',
    elevation: 3200,
  },
  grid: {
    zone: 'north',
    unit: 'm',
    easting: 521679.496,
    northing: 1100285.503,
    verticalDatum: '',
    elevation: null,
  },
  status: {
    ugrc: {
      approved: null,
      comments: null,
      reviewedAt: null,
      reviewedBy: null,
    },
    county: {
      approved: null,
      comments: null,
      reviewedAt: null,
      reviewedBy: null,
    },
    sgid: {
      approved: null,
    },
    user: {
      cancelled: null,
    },
  },
});
db.collection('submissions').add({
  blm_point_id: 'UT260030S0060W0_160340',
  created_at: new Date(),
  county: 'Davis',
  type: 'existing',
  metadata: {
    pdf: 'submitters/uid/existing/point_id/existing-sheet.pdf',
    mrrc: true,
  },
  location: new GeoPoint(40.533658034174834, -112.57336934258373),
  pdf: 'under-review/UT260030S0060W0_160340/Y0D4o9od4ojHpGaL9gg6uK3dgNuK/VWywBvCxs1IBMcXFyeVe.pdf',
  datum: 'geographic-nad83',
  submitted_by: {
    id: 'Y0D4o9od4ojHpGaL9gg6uK3dgNuK',
    name: 'Raccoon Peach',
    ref: 'submitters/Y0D4o9od4ojHpGaL9gg6uK3dgNuK',
  },
  geographic: {
    northing: { seconds: 10, minutes: 14, degrees: 41 },
    easting: { seconds: 29, minutes: 14, degrees: 111 },
    unit: 'm',
    elevation: 3200,
  },
  grid: {
    zone: 'north',
    unit: 'm',
    easting: 521679.496,
    northing: 1100285.503,
    verticalDatum: '',
    elevation: null,
  },
  status: {
    ugrc: {
      approved: null,
      comments: null,
      reviewedAt: null,
      reviewedBy: null,
    },
    county: {
      approved: null,
      comments: null,
      reviewedAt: null,
      reviewedBy: null,
    },
    sgid: {
      approved: null,
    },
    user: {
      cancelled: null,
    },
  },
});
