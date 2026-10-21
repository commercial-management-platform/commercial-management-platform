/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Por defecto "/api" (en desarrollo Vite lo redirige al backend). */
  readonly VITE_API_URL?: string
  /** Backend al que apunta el proxy de desarrollo. Por defecto http://localhost:3000. */
  readonly VITE_API_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
