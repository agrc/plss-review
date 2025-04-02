const admin = require('firebase-admin');

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
} catch (error) {
  console.error('Error initializing Firebase:', error);
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const authorizedUsers = ['stdavis@utah.gov',
  'sgourley@utah.gov', 'sfernandez@utah.gov', 'denisepeterson@utah.gov', 'miriamseely@utah.gov', 'lault@utah.gov'];

const db = admin.firestore();

// Create promises for adding each user to the collection
const promises = authorizedUsers.map(email =>
  db.collection('authorized-users').doc(email).set({})
    .then(() => console.log(`Successfully added ${email} to authorized-users collection`))
);

// Wait for all promises to complete
Promise.all(promises)
  .then(() => {
    console.log('All users added successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error adding documents:', error);
    process.exit(1);
  });
