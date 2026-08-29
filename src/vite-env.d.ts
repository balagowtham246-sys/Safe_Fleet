/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPROVED_MANAGER_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
