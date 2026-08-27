import logo from '@/assets/eunicemed-logo.png';
import logoOnDark from '@/assets/eunicemed-logo-on-dark.png';
import mark from '@/assets/eunicemed-mark.png';

/**
 * 品牌標誌。**用品牌方提供的正式圖檔**，與公開站同一組檔案
 * （`apps/web/public/brand/`），來源與重出方式見 [docs/14-assets.md](../../../../docs/14-assets.md)。
 *
 * <p>
 * 顏色取規範 PDF 的「數位媒體用」那組（灰 `rgb(137,137,137)`、青 `rgb(0,181,205)`），
 * 版本取「小於 45mm（®加大）」那支 —— 後台的版位一律遠小於 45mm。
 * </p>
 *
 * <p>
 * ⚠️ **`compact` 用的加號是規範裡沒有的用法。** 那個形狀是官方原稿裡的加號原封不動裁下來的，
 * 但「加號單獨當標記」是我們為了收合側欄與 favicon 自己延伸的 —— 完整鎖定樣式在 32px 讀不出來。
 * 客戶若給了正式的 icon 版本，這裡與 `apps/web/app/favicon.ico` 一起換掉。
 * </p>
 *
 * <p>
 * 後台是 Vite，圖檔走 `import` 讓打包器處理 `base: '/admin/'` 與 hash；
 * **不要**改成寫死 `/brand/...` 的絕對路徑 —— 那在 `vite dev`（:5173）會 404。
 * </p>
 */
export function Logo({
  onDark = false,
  compact = false,
}: {
  onDark?: boolean;
  /** 側欄收合時只留加號 —— 完整鎖定樣式縮到這個寬度會糊掉 */
  compact?: boolean;
}) {
  if (compact) {
    return <img src={mark} alt="EuniceMed" width={512} height={512} className="block h-8 w-8" />;
  }

  return (
    <img
      src={onDark ? logoOnDark : logo}
      alt="EuniceMed"
      width={480}
      height={189}
      className="block h-[38px] w-auto"
    />
  );
}
