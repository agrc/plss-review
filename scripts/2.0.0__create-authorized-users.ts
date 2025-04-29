import { initializeFirebase } from './utils';

const db = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const authorizedUsers: string[] = [
  'stdavis@utah.gov',
  'sgourley@utah.gov',
  'sfernandez@utah.gov',
  'denisepeterson@utah.gov',
  'miriamseely@utah.gov',
  'lault@utah.gov',
];

// Create promises for adding each user to the collection
const promises: Promise<void>[] = authorizedUsers.map((email) =>
  db
    .collection('authorized-users')
    .doc(email)
    .set({})
    .then(() => console.log(`Successfully added ${email} to authorized-users collection`)),
);

// Wait for all promises to complete
Promise.all(promises)
  .then(() => {
    console.log('All users added successfully');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Error adding documents:', error);
    process.exit(1);
  });
