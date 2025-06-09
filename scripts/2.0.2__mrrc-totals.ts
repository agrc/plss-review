import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

async function migrate(): Promise<void> {
  console.log('Starting creation of mrrc count...');

  try {
    const snapshot = await db.doc('stats/mrrc').get();

    if (snapshot.exists) {
      return;
    }

    console.log('creating document');
    await db.doc('stats/mrrc').set({
      beaver: 0,
      boxElder: 0,
      cache: 0,
      carbon: 0,
      daggett: 0,
      davis: 0,
      duchesne: 0,
      emery: 0,
      garfield: 0,
      grand: 0,
      iron: 0,
      juab: 0,
      kane: 0,
      millard: 0,
      morgan: 0,
      piute: 0,
      rich: 0,
      saltLake: 0,
      sanJuan: 0,
      sanpete: 0,
      sevier: 0,
      summit: 0,
      tooele: 0,
      uintah: 0,
      utah: 0,
      wasatch: 0,
      washington: 0,
      wayne: 0,
      weber: 0,
    });

    console.log('Successfully migrated.');
  } catch (error) {
    console.error('Error migrating:', error);
    throw error;
  }
}

migrate()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
