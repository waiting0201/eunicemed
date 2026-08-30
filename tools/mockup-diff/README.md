# mockup-diff — 前台版型與 mockup4 的逐字比對

`apps/web` 的版型**逐元素照抄** `mockup4/`。這個目錄是讓「照抄」可被機器驗證的工具。

## 為什麼是比對「宣告集合」

mockup4 沒有 stylesheet：18 頁共 **1,837 個 inline `style="…"`**、全站只有 5 個 `class`。
所以移植的作法是把那些字串原封搬進 `css`…`` 樣板（見 `apps/web/lib/css.ts`），
兩邊維持**同一種語法**，比對就退化成字串集合的差集 —— 沒有 camelCase 來回轉換，
也就沒有那一整類的假警報。

比的是**集合**而不是 DOM 樹，所以資料驅動的 JSX 不會造成對位問題：
一個 `css`…`` 條目渲染 8 張卡，對上 mockup4 那 8 個相同的 `style` 屬性，
兩邊 distinct 之後自然相等。

## 以分號切割是安全的（可複驗）

```bash
find mockup4 -maxdepth 1 -name '*.dc.html' ! -name 'Home Directions*' -print0 \
  | xargs -0 grep -oh 'style="[^"]*"' > /tmp/m4.txt
wc -l /tmp/m4.txt                                   # 1837
grep -c '!important' /tmp/m4.txt                    # 0
grep -c 'url(' /tmp/m4.txt                          # 0
grep -c -- '--' /tmp/m4.txt                         # 0（沒有自訂屬性）
grep -cE '\([^)]*;[^)]*\)' /tmp/m4.txt              # 0（括號內沒有分號）
grep -oh '\-webkit-[a-z-]*' /tmp/m4.txt | sort -u   # 只有 -webkit-column-break-inside
```

總計 7,546 條宣告、**557 條相異**、73 個相異屬性 —— 所以全站的靜態檢查很快。

## 用法

```bash
node tools/mockup-diff/check.mjs                  # 全部 18 頁
node tools/mockup-diff/check.mjs --page Contact   # 單頁
node tools/mockup-diff/check.mjs --snapshot       # 重建 baseline/
```

- **MISSING**：mockup4 有、實作沒有。這就是待辦清單。
- **EXTRA**：實作有、mockup4 沒有。抓自創的樣式。
- 例外寫在 `allow.json`，**每一條都要有理由** —— 那份檔案就是全站「明知故犯」的完整紀錄。

## 這個工具證明不了什麼

比對的是**宣告集合**，所以它能抓「值抄錯」與「自創樣式」，
但**抓不到「這個元素根本沒被渲染」**。

2026-08-30 實際踩到：`page-map.json` 把 `PageBand.tsx` 列進 FAQ／Insights／News／
Downloads／Where to Buy／Applications 的檔案清單，那 6 頁因此算「有覆蓋」band 的宣告 ——
但它們從來沒有 `import PageBand`，線上根本沒有那條頁頂圖帶。**六頁 100%，六頁都缺一整段。**

`page-map.json` 是人維護的「這一頁用到哪些檔案」，列進去不等於用到。
版型是否完整仍要靠眼睛（或 `viewport-check.mjs` 的截圖）確認，這支只保證「有的部分抄對了」。

## baseline/ 是什麼

`mockup4/` 不進版控（客戶資產，見 docs/14-assets.md），所以它改了也 diff 不出來。
`baseline/` 存的是**每頁正規化後的相異宣告集合**，而且**進版控**。三個好處：

1. 沒有 `mockup4/` 的機器（CI、新 clone）仍能比對；兩者都沒有就跳過，
   **絕不可**讓它成為 build 的相依。
2. mockup4 下次再改，`--snapshot` 之後的 `git diff` **就是那份拿不到的 mockup diff**。
3. 它記錄了本次移植所對齊的 mockup4 狀態（2026-08-27 的版本）。

> **規則**：mockup4 一有變動，就跑 `--snapshot`，並把 baseline 的變更**跟程式碼改動放同一個 commit**。

## 排除項

- `Home Directions.dc.html` **不是** 18 頁之一，是首頁方向比較板（1A Clinical Airy / 1B Arc Statement），
  一律排除，否則會灌進約 300 條不屬於本站的宣告。
- 規格標註物不算設計，抽取時就剔除：整個 `background:rgba(10,30,38,.55)` 的膠囊
  （`slide 1 · 2560×960`、`8:3`），以及值含 `ui-monospace`、`repeating-linear-gradient(` 的宣告（佔位斜紋與其說明字）。
