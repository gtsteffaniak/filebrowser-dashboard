/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LOCAL_DATA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
