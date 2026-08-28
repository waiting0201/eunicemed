# RWD 待辦清單

> mockup4 **完全沒有斷點**（其 `DESIGN.md` 自列為「已知未處理」），版面是寫死的固定 grid。
> 逐元素照抄的第一階段因此會把既有的響應式行為拿掉；**拿掉的每一處都記在這裡**，
> 第二階段照這份清單重建。

## 為什麼不能用 Tailwind 的 `lg:` 前綴重建

版型值現在是 inline style，**class 打不過 inline**：

```tsx
<div style={S.grid} className="lg:grid-cols-[1fr_1.1fr]">   {/* ← 沒有作用 */}
```

所以第二階段用 `globals.css` 裡一個集中的 `@media` 區塊，以 `data-r` 屬性選取，
並且**必須**帶 `!important`。好處是全站的響應式行為集中在一個可審查的區塊裡，
而且第一階段照抄的字串永遠不必被動到，靜態比對得以一直保持精確。

```css
@media (max-width: 900px) {
  [data-r~='stack']  { grid-template-columns: 1fr !important; }
  [data-r~='cols-2'] { grid-template-columns: repeat(2, 1fr) !important; }
  [data-r~='cols-1'] { columns: 1 !important; }
  [data-r~='hide']   { display: none !important; }
}
```

## 清單

第一階段每移除一個斷點就在此追加一行。

| 檔案:行 | 移除的 class | mockup4 的固定值 | 預定的 `data-r` |
|---|---|---|---|
| `apps/web/components/SiteNav.tsx` | `hidden md:flex` | `display:flex`（mockup4 沒有手機版頁首） | `hide` — 但**手機需要漢堡選單**，mockup4 沒有設計，第二階段要現場設計 |
| `apps/web/app/[locale]/page.tsx` §01 | `sm:columns-2 lg:columns-4` | `columns:4` | `cols-1`（已標） |
| `apps/web/app/[locale]/page.tsx` §02 | `lg:grid-cols-[0.9fr_1.1fr]` | `grid-template-columns:.9fr 1.1fr` | `stack` |
| `apps/web/app/[locale]/page.tsx` §03 | `sm:grid-cols-2 lg:grid-cols-4` | `grid-template-columns:repeat(4,1fr)` | `cols-2` → `stack` |
| `apps/web/app/[locale]/page.tsx` §04 | `lg:grid-cols-[1.02fr_0.98fr]` | `grid-template-columns:1.02fr .98fr` | `stack` |
| `apps/web/components/ProductGrid.tsx` | `grid-cols-2 lg:grid-cols-4` | `grid-template-columns:repeat(4,1fr)` | `cols-2`（已標） |
| `apps/web/app/[locale]/products/page.tsx` | `sm:grid-cols-2 lg:grid-cols-3` | `grid-template-columns:repeat(3,1fr)` | `stack`（已標） |
| `apps/web/components/CategoryHero.tsx` | `lg:grid-cols-[1.05fr_0.95fr]` | `grid-template-columns:1.05fr .95fr` | `stack`（已標） |
| `apps/web/components/CategoryOutro.tsx` | `lg:grid-cols-3` | `grid-template-columns:repeat(3,1fr)` | `stack`（已標） |
| `apps/web/app/[locale]/faq/page.tsx` | `lg:grid-cols-[260px_1fr]` | `grid-template-columns:260px 1fr` | `stack`（已標） |
| `apps/web/components/SideFilter.tsx` | `lg:sticky lg:top-[100px]` | `position:sticky;top:100px` | 手機需改為橫向捲動或收合 |
| `apps/web/app/[locale]/where-to-buy/page.tsx` | `sm:grid-cols-2 lg:grid-cols-3` | `grid-template-columns:repeat(3,1fr)` | `stack`（已標） |
| `apps/web/components/ArticleListPage.tsx` | `lg:grid-cols-[240px_1fr]`、`sm:grid-cols-2` | `240px 1fr`、`repeat(2,1fr)` | `stack`（已標） |
| `apps/web/components/ArticleCard.tsx` | `lg:grid-cols-[1.2fr_1fr]` | `1.2fr 1fr` | `stack`（已標） |
| `apps/web/app/[locale]/downloads/page.tsx` | `lg:grid-cols-[240px_1fr]` | `240px 1fr` | `stack`（已標） |
| `apps/web/components/ArticleDetailPage.tsx` | `lg:grid-cols-[minmax(0,1fr)_260px]`、`sm:grid-cols-2/3`、`lg:sticky` | `minmax(0,1fr) 260px`、`repeat(3,1fr)`、`position:sticky` | `stack` / `static`（已標） |
| `apps/web/components/ContactForm.tsx` | `sm:grid-cols-2` | `grid-template-columns:1fr 1fr` | `stack`（已標） |
| `apps/web/app/[locale]/applications/**` | `sm:/lg:grid-cols-*` | `repeat(3,1fr)`／`repeat(4,1fr)`／`1fr 1fr` | `stack` / `cols-2`（已標） |
| `apps/web/app/[locale]/products/**/[slug]/page.tsx` | `lg:grid-cols-2`、`lg:grid-cols-[1fr_1.3fr]`、`sm:flex-row` | `1fr 1fr`、`1fr 1.3fr`、`display:flex` | `stack`（已標） |
| `apps/web/components/ProductInquiry.tsx`、`PartnershipForm.tsx` | `sm:grid-cols-2` | `1fr 1fr` | `stack`（已標） |
| `apps/web/components/BodyMap.tsx` | `lg:grid-cols-[440px_1fr]` | `440px 1fr` | `stack`（已標）——**人體圖在窄螢幕需另行設計**：熱點與 chip 是固定座標 |
| `apps/web/app/[locale]/resources/page.tsx` | （無） | 全部用 `repeat(auto-fit,minmax(…,1fr))` | 本來就會自己收，第二階段可能不必動 |

## 第二階段的已知難題

1. **手機沒有導覽**：mockup4 完全沒有手機版頁首，`SiteNav` 目前是 `data-r="hide"`。
   漢堡選單要現場設計 —— 這是全站最大的一塊缺口。
2. **人體圖**：`BodyMap` 的熱點與 chip 是 viewBox 座標換算的百分比，直接堆疊會重疊。
3. **側欄篩選**：`SideFilter` 是 `position:sticky` 的 240/260px 直欄，窄螢幕要改成橫向捲動或收合。
4. **尺寸表**：`SizeChart` 最多 5 欄，窄螢幕要能橫向捲動而不是壓扁。
