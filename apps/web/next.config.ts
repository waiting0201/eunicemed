import type { NextConfig } from 'next';

/**
 * ⚠️ 部署目標是 Azure Static Web Apps **Free** 方案的 Next.js hybrid（preview 功能）。
 * 這裡幾乎每一項設定都對應一條該平台的硬限制，改動前先讀 docs/07-azure-deployment.md §7。
 */
const nextConfig: NextConfig = {
  // SWA Free 單一環境上限 250MB。standalone 是必須，不是最佳化選項。
  output: 'standalone',

  images: {
    /**
     * **關閉 Next.js 的圖片優化。**
     *
     * 預設情況下 next/image 會由 SWA 的 managed backend 代為縮圖並輸出，
     * 那會讓每一個位元組都計入 SWA Free 的 100GB/月頻寬 —— 超額不能加購，直接中斷。
     *
     * 本站改為：所有響應式尺寸在上傳當下就由 API 產生成實體檔案
     * （docs/11-media-specs.md §2a），前端只負責從 Blob 挑對的那一張。
     * 見 lib/image.ts。
     */
    unoptimized: true,

    remotePatterns: [
      { protocol: 'https', hostname: '*.blob.core.windows.net' },
      // 本機 Azurite
      { protocol: 'http', hostname: '127.0.0.1', port: '10000' },
    ],
  },

  /**
   * 安全標頭由此輸出 —— 本案沒有 Front Door，沒有別的地方可以加。
   * 見 docs/07 §7.4。
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  /**
   * 語系前綴的補上與導向一律在 middleware.ts 處理，這裡刻意不設 redirects/rewrites。
   *
   * 若日後要在此加任何 redirect 或 rewrite，**source 必須排除 `.swa` 開頭**：
   * SWA 以 `/.swa/health.html` 驗證部署，被攔下就會判定部署失敗。
   * 寫法：`source: '/((?!\\.swa).*)/舊路徑'`。見 docs/07 §7.2。
   */
};

export default nextConfig;
