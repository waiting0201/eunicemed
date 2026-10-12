import type { Faq } from '@/lib/api';
import { css } from '@/lib/css';

/** 樣式逐字取自 `mockup4/FAQ.dc.html`。展開狀態與答案排版在 globals.css。 */
const S = {
  item: css`border-bottom:1px solid #DFE9EC;`,
  summary: css`display:flex;justify-content:space-between;align-items:center;gap:20px;cursor:pointer;padding:20px 4px;`,
  question: css`color:#16333B;font-weight:570;font-size:1.08rem;`,
  icon: css`color:#0092A8;font-size:1.5rem;font-weight:300;line-height:1;transition:transform .3s cubic-bezier(.34,1.56,.64,1);flex:0 0 auto;`,
  answer: css`overflow:hidden;min-height:0;padding:0 4px 20px;max-width:72ch;`,
} as const;

/**
 * FAQ 折疊列。FAQ 頁與 Partnership 的 OEM/ODM FAQ 共用。
 *
 * <p>
 * 用原生 `<details>` 而不是 useState 的手風琴：不需要任何 client JS，
 * 且鍵盤操作與無障礙語意瀏覽器已經給了。`marker:hidden` 是為了拿掉預設三角形，改用右側的 +/−。
 * </p>
 */
export function FaqList({ items }: { items: Faq[] }) {
  return items.map((faq) => (
    <details key={faq.id} className="m4-faq" style={S.item}>
      <summary style={S.summary}>
        <h3 style={S.question}>{faq.question}</h3>
        <span aria-hidden className="m4-faq-icon" style={S.icon}>
          +
        </span>
      </summary>
      <div
        className="m4-answer"
        style={S.answer}
        // 已在寫入時以白名單淨化，前端不再淨化一次（見產品詳情頁的說明）
        dangerouslySetInnerHTML={{ __html: faq.answer }}
      />
    </details>
  ));
}
