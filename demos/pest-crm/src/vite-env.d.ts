/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_LEADS_TAB_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
