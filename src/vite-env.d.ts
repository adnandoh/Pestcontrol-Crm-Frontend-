/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_WHATSFLOW_API_BASE_URL?: string;
  readonly VITE_WHATSFLOW_WS_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
