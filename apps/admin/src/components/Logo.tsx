/**
 * 品牌標誌。
 *
 * <p>
 * **復刻 mockup4 的鎖定樣式**（客戶已定案的版型）：圓角外框內「EUNICE / MED®」
 * 兩行，右側一個品牌青的加號。倉庫裡沒有向量 logo 檔 ——
 * `reference/sbk/` 只有規範 PDF 與 JPG 形象圖，而從 JPG 取點陣圖
 * 會在側欄縮放與深色底反白時都不好看。用標記組出來可縮放、可換色、零位元組。
 * </p>
 *
 * <p>
 * 深色底（側欄／頁尾）換一組色，與 mockup4 的頁尾版一致：
 * 外框與字轉為淺灰，加號**維持品牌青不變** —— 那是識別的固定元素。
 * </p>
 *
 * <p>
 * ⚠️ 字級與字距是規範的一部分（`標準EuniceMed logo 及其他圖形使用規範.pdf`），
 * 不要為了塞進某個版位而個別調整；要縮就整個 `scale`。
 * </p>
 */
export function Logo({
  onDark = false,
  compact = false,
}: {
  onDark?: boolean;
  /** 側欄收合時只留加號 —— 縮小整個鎖定樣式會讓字距失真 */
  compact?: boolean;
}) {
  const frame = onDark ? '#4A585E' : '#16333B';
  const word = onDark ? '#9FAFB5' : '#16333B';

  if (compact) {
    return (
      <span
        role="img"
        aria-label="EuniceMed"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] font-extrabold"
        style={{ border: `2.5px solid ${frame}`, color: '#00B5CD', fontSize: '1.15rem' }}
      >
        +
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label="EuniceMed"
      className="inline-flex items-center gap-2 rounded-[10px] px-3 py-[5px] leading-none"
      style={{ border: `2.5px solid ${frame}` }}
    >
      <span
        aria-hidden
        style={{ color: word, fontWeight: 680, letterSpacing: '.12em', fontSize: '.82rem' }}
      >
        EUNICE
        <br />
        MED
        <span style={{ fontSize: '.5em', verticalAlign: 'super' }}>®</span>
      </span>
      {/* 加號在深色底也維持品牌青 —— 它是識別的固定元素 */}
      <span aria-hidden style={{ color: '#00B5CD', fontWeight: 800, fontSize: '1.15rem' }}>
        +
      </span>
    </span>
  );
}
