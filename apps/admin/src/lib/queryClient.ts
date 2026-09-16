import { QueryClient } from '@tanstack/react-query';

/**
 * 全站唯一的 query client。
 *
 * <p>
 * 從 `main.tsx` 搬出來，是為了讓非元件的程式碼也能讓快取失效 ——
 * `mediaStaging.ts` 在存檔時才真正上傳圖片，上傳完要把 `['media-all']` 標記過期，
 * 但它不在 React 樹裡，拿不到 `useQueryClient()`。
 * </p>
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 後台的資料由使用者自己改動，切回分頁時重抓沒有意義且會干擾正在填的表單
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});
