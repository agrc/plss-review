import { initializeFirebase } from './utils';

const { db, auth } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const newUser = {
  email: 'staff-reviewer@utah.gov',
  displayName: 'Staff Reviewer',
  emailVerified: true,
  disabled: false,
};

// Get tenant-specific Auth instance
const tenantId = 'plss-review';
const tenantAuth = auth.tenantManager().authForTenant(tenantId);

// Use tenant-specific Auth to create user
tenantAuth
  .createUser(newUser)
  .then((userRecord) => {
    console.log(`Successfully created new user: ${newUser.email} with UID: ${userRecord.uid} in tenant: ${tenantId}`);

    // Explicitly update the user to link the provider
    return tenantAuth
      .updateUser(userRecord.uid, {
        providerToLink: {
          providerId: 'oidc.plss-review',
          displayName: newUser.displayName,
          uid: newUser.email,
        },
      })
      .then(() => {
        console.log(`Linked provider for user: ${userRecord.uid}`);

        return tenantAuth.setCustomUserClaims(userRecord.uid, {
          provider: 'oidc.plss-review',
        });
      })
      .then(() => {
        return db.collection('submitters').doc(userRecord.uid).set({
          email: newUser.email,
          displayName: newUser.displayName,
          elevated: true,
        });
      });
  })
  .catch((error) => {
    if (error.code === 'auth/email-already-exists') {
      console.log(`User with email ${newUser.email} already exists.`);
    } else {
      console.error('Error creating new user:', error);
    }
  });
