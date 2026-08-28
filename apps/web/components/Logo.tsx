import Image from 'next/image';
import { css } from '@/lib/css';

/**
 * 品牌標誌。**用品牌方提供的正式圖檔**，不再以標記復刻。
 *
 * <p>
 * 來源是 `reference/sbk/EuniceMed 素材整理新版 20250110.ai` 裡的向量原稿，
 * 依 `reference/sbk/標準EuniceMed logo 及其他圖形使用規範.pdf` 取兩件事：
 * </p>
 *
 * <ul>
 *   <li>**顏色用「數位媒體用」那組**：灰 `rgb(137,137,137)`、青 `rgb(0,181,205)`
 *       —— 不是 .ai 裡的特別色印刷值（那組是 `rgb(137,140,141)` / `rgb(11,157,184)`）。</li>
 *   <li>**版本用「小於 45mm（®加大）」那支**：45mm 約等於 170px，
 *       網站上不論頁首或頁尾都遠小於此，標準版的 ® 在這個尺寸會糊掉。</li>
 * </ul>
 *
 * <p>
 * 深色底另有一支官方版本（外框與字為淺灰 `#E1E1E1`，加號維持品牌青），
 * 對應規範裡的「深色背景用」，不是把亮版濾色濾出來的。
 * </p>
 *
 * <p>
 * ⚠️ 圖檔是 480×189 的點陣圖（規範 PDF 與 .ai 都沒有可直接上網的 SVG）。
 * 以 4.5 倍密度輸出，頁首 42px 高綽綽有餘；**要放大到 200px 以上請回頭從 .ai 重出**，
 * 不要拉伸。重出流程見 docs/14-assets.md。
 * </p>
 *
 * <p>
 * ⚠️ **後台 `apps/admin/src/components/Logo.tsx` 是另一份**，同樣吃這兩個檔；
 * 換圖時兩邊都要換。
 * </p>
 */
/** 逐字取自 mockup4 的 `<img>`：頁首頁尾都是同一組。 */
const S = {
  img: css`display:block;height:42px;width:auto;`,
} as const;

const SRC = {
  light: '/brand/eunicemed-logo.png',
  dark: '/brand/eunicemed-logo-on-dark.png',
} as const;

export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Image
      src={onDark ? SRC.dark : SRC.light}
      alt="EuniceMed"
      width={480}
      height={189}
      /* 高度鎖 42px、寬度自動 —— 逐字照 mockup4，且不會壓到原比例 */
      style={S.img}
    />
  );
}
