/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_DISCOVER: string;
  readonly VITE_WEB_API: string;
  readonly VITE_FIREBASE_CONFIG: string;
  readonly VITE_FIREBASE_TENANT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
