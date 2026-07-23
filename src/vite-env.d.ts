/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_WHATSAPP_API_URL?: string;
  readonly VITE_WHATSAPP_API_KEY?: string;
  /** Alias accepted by WhatsApp inbox / e-card SSO */
  readonly VITE_WHATSFLOW_API_KEY?: string;
  readonly VITE_WHATSAPP_WS_URL?: string;
  /** @deprecated Use VITE_WHATSAPP_API_URL */
  readonly VITE_WHATSFLOW_API_BASE_URL?: string;
  /** @deprecated Derived from VITE_WHATSAPP_API_URL when omitted */
  readonly VITE_WHATSFLOW_WS_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
