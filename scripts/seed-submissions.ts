import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

db.collection('submissions').add({
  blm_point_id: 'UT260030S0060W0_100131',
  created_at: new Date(),
  county: 'Beaver',
  type: 'existing',
  metadata: {
    pdf: 'submitters/uid/existing/point_id/existing-sheet.pdf',
    mrrc: false,
  },
  monument: 'under-review/UT260030S0060W0_100140/Y0D4o9od4ojHpGaL9gg6uK3dgNuK/extEVuYqmTJgeM1LxrbU.pdf',
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
    },
    county: {
      approved: null,
      comments: null,
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
  blm_point_id: 'UT260030S0060W0_100139',
  created_at: new Date(),
  county: 'Davis',
  type: 'existing',
  metadata: {
    pdf: 'submitters/uid/existing/point_id/existing-sheet.pdf',
    mrrc: false,
  },
  monument: 'under-review/UT260030S0060W0_100140/Y0D4o9od4ojHpGaL9gg6uK3dgNuK/extEVuYqmTJgeM1LxrbU.pdf',
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
    },
    county: {
      approved: null,
      comments: null,
    },
    sgid: {
      approved: null,
    },
    user: {
      cancelled: null,
    },
  },
});
