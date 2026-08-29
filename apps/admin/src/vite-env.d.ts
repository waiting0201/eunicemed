/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * API 的絕對位址（build 時注入）。
   *
   * 本機**不要設**：vite dev server 有 `/api` → `localhost:7071` 的 proxy，
   * 走相對路徑就不會有 CORS。正式站沒有那層 proxy —— 後台與公開站同網域，
   * 但 API 在 `*.azurewebsites.net`，瀏覽器 XHR 是跨網域直打 Function App
   * （docs/03 §1、infra/main.bicep 的 CORS 註解）。
   */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
