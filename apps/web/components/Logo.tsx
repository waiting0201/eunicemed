/**
 * 品牌標誌。復刻 mockup4 的鎖定樣式：圓角外框內「EUNICE / MED®」兩行，
 * 右側一個品牌青的加號。
 *
 * <p>
 * 倉庫裡沒有向量 logo 檔（`reference/sbk/` 只有規範 PDF 與 JPG 形象圖），
 * 所以用標記組出來 —— 可縮放、可換色、零位元組。
 * </p>
 *
 * <p>
 * ⚠️ **後台有一份幾乎相同的 `apps/admin/src/components/Logo.tsx`。**
 * 兩個 app 沒有共用套件，為一個純呈現元件開一個 workspace package 不划算；
 * 但改動時**兩邊都要改** —— 字級與字距是品牌規範的一部分
 * （`標準EuniceMed logo 及其他圖形使用規範.pdf`），不可各自漂移。
 * </p>
 */
export function Logo({ onDark = false }: { onDark?: boolean }) {
  const frame = onDark ? '#4A585E' : '#16333B';
  const word = onDark ? '#9FAFB5' : '#16333B';

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
