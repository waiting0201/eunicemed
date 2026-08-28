# RWD

> mockup4 **完全沒有斷點**（其 `DESIGN.md` 自列為「已知未處理」），版面是寫死的固定 grid。
> 桌機版逐元素照抄 mockup4（`pnpm --filter web mockup:check` 18/18 100%），
> **手機／平板這一層是現場設計的**，規則集中在 `apps/web/app/globals.css` 最後一段。

**狀態：已完成。** 18 頁 × 390／768／1280px 實測無橫向溢出，見下方「怎麼驗」。

## 為什麼要用 `!important` 與屬性選取器

版型值是逐字照抄 mockup4 的 inline style（見 `lib/css.ts`），**class 在權重上打不過 inline**，
`lg:` 這類前綴會完全沒有作用，所以這一段是全站唯一允許 `!important` 的地方。

選取器不逐個標記，而是用 `[style*="grid-template-columns"]`：實測手動標記會漏 ——
53 個固定 grid 漏了 6 個。改成**安全預設**（任何寫死欄數的 grid 一律收成單欄）之後，
漏標最多是變高，不會爆版；要維持多欄的地方再用 `data-r` 明講。

## 斷點與標記

| 斷點 | 行為 |
|---|---|
| ≤1024px | 固定欄數 grid → 單欄；桌機導覽收進漢堡選單；黏著側欄不再黏 |
| ≤780px | 人體圖的浮動 chip 收起（固定座標，縮小會互疊） |
| ≤640px | `cols-2` → 單欄；瀑布流 → 單欄 |

| `data-r` | 意思 |
|---|---|
| （不標） | 收成單欄。**這是預設**，多數版面用這個 |
| `cols-2` | 卡片格：平板兩欄，手機一欄 |
| `cols-2-phone` | 產品格：手機也維持兩欄（1:1 圖磚加兩行字，390px 下每欄約 170px 仍讀得清楚） |
| `keep` | 不准收欄（尺寸表、產品縮圖列） |
| `hide` | 窄螢幕隱藏（桌機導覽、Where to Buy 藥丸、語系切換） |
| `only-mobile` | 只在窄螢幕出現（漢堡鈕） |
| `hide-narrow` | ≤780px 隱藏（人體圖 chip） |
| `figure` | ≤640px 縮到 128px 並置中（尺寸表旁的量測部位圖，換行後會靠左孤懸） |
| `unstick` | 取消 `position:sticky` |
| `scroll` | 改成橫向捲動（Resources 次導覽） |

## 五個需要現場設計的地方（都已處理）

1. **手機導覽**：mockup4 18 頁都只有桌機那一列，沒有漢堡也沒有抽屜。
   `components/MobileNav.tsx` 是現場設計的，沿用版型既有語彙（76px 頁首、`#DFE9EC` 細線、品牌青作用色、藥丸鈕）。
   ⚠️ 抽屜與遮罩**必須用 portal 掛到 `<body>`**：頁首有 `backdrop-filter`，
   而它會讓該元素成為 `position:fixed` 子孫的包含塊 —— 留在裡面時遮罩高度實測為 0。
2. **人體圖**：熱點與 chip 是固定座標，縮小會互疊且點不準。≤780px 收起 chip，
   改由下方的部位卡操作（功能完全相同，不少任何操作）。
3. **側欄篩選**：240/260px 的黏著直欄改為一般區塊，堆在內容上方。
4. **尺寸表**：**不收欄**（收了就不是表了），改成整塊橫向捲動，每欄最小 64px。
5. **量測部位圖**：桌機 152px（再寬表格就會橫捲）；約 510px 以下會被 `flex-wrap` 擠到表格下方，
   ≤640px 縮到 128px 並置中（`data-r="figure"`）。

## 怎麼驗

```bash
# 需要完整本機環境（docs/12 §3）：docker start sqlserver / azurite / func start
cd apps/web && API_BASE=http://localhost:7071/api PORT=3123 node .next/standalone/server.js

# 另一個終端：以 CDP 量測每頁在各寬度是否有橫向溢出
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --remote-debugging-port=9222 --user-data-dir=/tmp/cdp about:blank &
node tools/mockup-diff/viewport-check.mjs http://localhost:3123 "/en,/en/products,…" "390,768,1280"
```

判讀：`scrollW` 不得大於 `inner`（大於就是橫向溢出）；
`hamburger` 應在 ≤1024 為 true、桌機為 false，`deskNav` 相反。
