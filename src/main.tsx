import esriConfig from '@arcgis/core/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import initializeTheme from '@ugrc/esri-theme-toggle';
import {
  FirebaseAnalyticsProvider,
  FirebaseAppProvider,
  FirebaseAuthProvider,
  FirebaseFunctionsProvider,
  FirestoreProvider,
} from '@ugrc/utah-design-system';
import { OAuthProvider } from 'firebase/auth';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MapProvider } from './components/contexts';
import './index.css';
import Routes from './Routes';

esriConfig.assetsPath = '/assets';

const provider = new OAuthProvider('oidc.utahid');
provider.addScope('profile');
provider.addScope('email');

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseAppProvider config={firebaseConfig}>
      <FirebaseAuthProvider provider={provider}>
        <FirebaseFunctionsProvider>
          <FirebaseAnalyticsProvider>
            <FirestoreProvider>
              <MapProvider>
                <BrowserRouter>
                  <QueryClientProvider client={queryClient}>
                    <Routes />
                    <ReactQueryDevtools initialIsOpen={false} />
                  </QueryClientProvider>
                </BrowserRouter>
              </MapProvider>
            </FirestoreProvider>
          </FirebaseAnalyticsProvider>
        </FirebaseFunctionsProvider>
      </FirebaseAuthProvider>
    </FirebaseAppProvider>
  </React.StrictMode>,
);
