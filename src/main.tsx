import esriConfig from '@arcgis/core/config';
import initializeTheme from '@ugrc/esri-theme-toggle';
import {
  FirebaseAnalyticsProvider,
  FirebaseAppProvider,
  FirebaseAuthProvider,
  FirebaseFunctionsProvider,
} from '@ugrc/utah-design-system';
import { OAuthProvider } from 'firebase/auth';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MapProvider } from './components/contexts';
import Routes from './Routes';

import './index.css';

const provider = new OAuthProvider('oidc.utahid');
provider.addScope('profile');
provider.addScope('email');
esriConfig.assetsPath = './assets';
initializeTheme();

let firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
};

if (import.meta.env.VITE_FIREBASE_CONFIG) {
  firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseAppProvider config={firebaseConfig}>
      <FirebaseAuthProvider provider={provider}>
        <FirebaseFunctionsProvider>
          <FirebaseAnalyticsProvider>
            <MapProvider>
              <BrowserRouter>
                <Routes />
              </BrowserRouter>
            </MapProvider>
          </FirebaseAnalyticsProvider>
        </FirebaseFunctionsProvider>
      </FirebaseAuthProvider>
    </FirebaseAppProvider>
  </React.StrictMode>,
);
