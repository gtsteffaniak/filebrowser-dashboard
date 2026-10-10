/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LOCAL_DATA: string;
  readonly VITE_DATA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
