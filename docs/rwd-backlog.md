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
