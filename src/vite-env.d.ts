/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERA_MCP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
