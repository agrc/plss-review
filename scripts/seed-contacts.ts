import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const testEmail = 'sgourley';

db.collection('contacts')
  .doc('admin')
  .set({
    beaver: [
      {
        name: 'Beaver County Surveyor',
        email: `${testEmail}+beaver@utah.gov`,
      },
    ],
    'box elder': [
      {
        name: 'Box Elder County Surveyor',
        email: `${testEmail}+boxelder@utah.gov`,
      },
    ],
    cache: [
      {
        name: 'Cache County Surveyor',
        email: `${testEmail}+cache@utah.gov`,
      },
    ],
    carbon: [
      {
        name: 'Carbon County Surveyor',
        email: `${testEmail}+carbon@utah.gov`,
      },
    ],
    daggett: [
      {
        name: 'Daggett County Surveyor',
        email: `${testEmail}+daggett@utah.gov`,
      },
    ],
    davis: [
      {
        name: 'Davis County Surveyor',
        email: `${testEmail}+davis@utah.gov`,
      },
    ],
    duchesne: [
      {
        name: 'Duchesne County Surveyor',
        email: `${testEmail}+duchesne@utah.gov`,
      },
    ],
    emery: [
      {
        name: 'Emery County Surveyor',
        email: `${testEmail}+emery@utah.gov`,
      },
    ],
    garfield: [
      {
        name: 'Garfield County Surveyor',
        email: `${testEmail}+garfield@utah.gov`,
      },
    ],
    grand: [
      {
        name: 'Grand County Surveyor',
        email: `${testEmail}+grand@utah.gov`,
      },
    ],
    iron: [
      {
        name: 'Iron County Surveyor',
        email: `${testEmail}+iron@utah.gov`,
      },
    ],
    juab: [
      {
        name: 'Juab County Surveyor',
        email: `${testEmail}+juab@utah.gov`,
      },
    ],
    kane: [
      {
        name: 'Kane County Surveyor',
        email: `${testEmail}+kane@utah.gov`,
      },
    ],
    millard: [
      {
        name: 'Millard County Surveyor',
        email: `${testEmail}+millard@utah.gov`,
      },
    ],
    morgan: [
      {
        name: 'Morgan County Surveyor',
        email: `${testEmail}+morgan@utah.gov`,
      },
    ],
    piute: [
      {
        name: 'Piute County Surveyor',
        email: `${testEmail}+piute@utah.gov`,
      },
    ],
    rich: [
      {
        name: 'Rich County Surveyor',
        email: `${testEmail}+rich@utah.gov`,
      },
    ],
    'salt lake': [
      {
        name: 'Salt Lake County Surveyor',
        email: `${testEmail}+saltlake@utah.gov`,
      },
    ],
    'san juan': [
      {
        name: 'San Juan County Surveyor',
        email: `${testEmail}+sanjuan@utah.gov`,
      },
    ],
    sanpete: [
      {
        name: 'Sanpete County Surveyor',
        email: `${testEmail}+sanpete@utah.gov`,
      },
    ],
    sevier: [
      {
        name: 'Sevier County Surveyor',
        email: `${testEmail}+sevier@utah.gov`,
      },
    ],
    summit: [
      {
        name: 'Summit County Surveyor',
        email: `${testEmail}+summit@utah.gov`,
      },
    ],
    tooele: [
      {
        name: 'Tooele County Surveyor',
        email: `${testEmail}+tooele@utah.gov`,
      },
    ],
    uintah: [
      {
        name: 'Uintah County Surveyor',
        email: `${testEmail}+uintah@utah.gov`,
      },
    ],
    utah: [
      {
        name: 'Utah County Surveyor',
        email: `${testEmail}+utah@utah.gov`,
      },
    ],
    wasatch: [
      {
        name: 'Wasatch County Surveyor',
        email: `${testEmail}+wasatch@utah.gov`,
      },
    ],
    washington: [
      {
        name: 'Washington County Surveyor',
        email: `${testEmail}+washington@utah.gov`,
      },
    ],
    wayne: [
      {
        name: 'Wayne County Surveyor',
        email: `${testEmail}+wayne@utah.gov`,
      },
    ],
    weber: [
      {
        name: 'Weber County Surveyor',
        email: `${testEmail}+weber@utah.gov`,
      },
    ],
  });
