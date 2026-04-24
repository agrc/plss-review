import { readFileSync, writeFileSync } from 'node:fs';

const firebaseConfigPath = 'firebase.json';
const firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf8'));

if (!Array.isArray(firebaseConfig.functions)) {
  throw new Error('Expected firebase.json functions configuration to be an array.');
}

let updated = false;

firebaseConfig.functions = firebaseConfig.functions.map((entry) => {
  if (entry?.source === 'deploy-functions') {
    updated = true;

    return entry;
  }

  if (entry?.source !== 'functions') {
    return entry;
  }

  updated = true;

  return {
    ...entry,
    source: 'deploy-functions',
  };
});

if (!updated) {
  throw new Error('Unable to find a Firebase functions source entry to rewrite for CI deploy.');
}

writeFileSync(firebaseConfigPath, `${JSON.stringify(firebaseConfig, null, 2)}\n`);
