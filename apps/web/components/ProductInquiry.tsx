'use client';

import { useActionState } from 'react';
import { css } from '@/lib/css';
import { submitContact, type ContactState } from '@/app/[locale]/contact/actions';
import type { Locale } from '@/lib/locale';

/**
 * 產品詳情頁 §08 的詢價面板（mockup4）：青色斜向漸層底、左文右白色表單卡。
 *
 * <p>
 * 送件帶 `type=product` 與 **送件當下的型號快照** `productSku`
 * （docs/05 §ContactSubmission：產品改名或換 slug 之後仍可追溯是哪一支）。
 * </p>
 *
 * ⚠️ `POST /contact` 尚未實作（擋於 SMTP 帳密），上線前送出會顯示失敗訊息。
 */
const COPY: Record<
  Locale,
  {
    name: string;
    namePlaceholder: string;
    email: string;
    message: string;
    messagePlaceholder: (product: string) => string;
    send: string;
    sending: string;
    thanks: string;
  }
> = {
  en: {
    name: 'Name',
    namePlaceholder: 'Your name',
    email: 'Email',
    message: 'Message',
    messagePlaceholder: (p) => `Tell us about your requirement (product: ${p})`,
    send: 'Send inquiry',
    sending: 'Sending…',
    thanks: 'Thank you — we have received your inquiry and will reply shortly.',
  },
  'zh-TW': {
    name: '姓名',
    namePlaceholder: '您的姓名',
    email: '電子郵件',
    message: '訊息內容',
    messagePlaceholder: (p) => `請說明您的需求（產品：${p}）`,
    send: '送出詢價',
    sending: '傳送中…',
    thanks: '感謝您的詢價，我們已收到並會盡快回覆。',
  },
};

/**
 * 樣式逐字取自 `mockup4/Product Detail.dc.html` §8 詢價。
 * 送出鈕在這裡是**墨色**（青色色帶上要有對比），不是品牌青。
 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  band: css`background:linear-gradient(135deg,#00B5CD 0%,#009DB6 55%,#0092A8 100%);border-radius:26px;padding:clamp(36px,5vw,56px);color:#fff;`,
  grid: css`display:grid;grid-template-columns:1fr 1.2fr;gap:48px;align-items:center;`,
  title: css`color:#fff;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);`,
  body: css`color:rgba(255,255,255,.88);margin-top:14px;max-width:36ch;`,
  card: css`background:#fff;border-radius:18px;padding:28px;`,
  pair: css`display:grid;grid-template-columns:1fr 1fr;gap:14px;`,
  label: css`display:block;`,
  labelLater: css`display:block;margin-top:14px;`,
  labelText: css`display:block;font-size:.82rem;font-weight:620;color:#16333B;margin-bottom:6px;`,
  field: css`width:100%;border:1px solid #DFE9EC;border-radius:12px;padding:11px 13px;font-size:.95rem;color:#16333B;background:#fff;font-family:inherit;`,
  textarea: css`width:100%;border:1px solid #DFE9EC;border-radius:12px;padding:11px 13px;font-size:.95rem;color:#16333B;background:#fff;font-family:inherit;resize:vertical;`,
  submit: css`margin-top:16px;background:#16333B;color:#fff;border:none;font-family:inherit;font-weight:620;font-size:.95rem;padding:13px 30px;border-radius:999px;cursor:pointer;`,
  /** 錯誤訊息是本站補的：mockup4 的表單不會送出 */
  error: css`margin-top:12px;font-size:.9rem;color:#B3261E;`,
  status: css`font-size:.95rem;`,
} as const;

export function ProductInquiry({
  locale,
  title,
  body,
  productName,
  productSku,
}: {
  locale: Locale;
  title: string;
  body: string;
  productName: string;
  productSku: string | null;
}) {
  const c = COPY[locale];
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, {
    status: 'idle',
  });

  return (
    <section id="inquiry" style={S.section}>
      <div style={S.band}>
        <div style={S.grid}>
          <div>
            <h2 style={S.title}>{title}</h2>
            <p style={S.body}>{body}</p>
          </div>

          {state.status === 'ok' ? (
            <div style={S.card}>
              <p role="status" style={S.status}>
                {c.thanks}
              </p>
            </div>
          ) : (
            <form action={action} style={S.card}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="type" value="product" />
              <input type="hidden" name="subject" value={productName} />
              {productSku && <input type="hidden" name="productSku" value={productSku} />}
              {/* 蜜罐 —— 對讀屏也隱藏，只有機器人會填 */}
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <div style={S.pair}>
                <label style={S.label}>
                  <span style={S.labelText}>{c.name}</span>
                  <input name="name" required placeholder={c.namePlaceholder} style={S.field} />
                </label>
                <label style={S.label}>
                  <span style={S.labelText}>{c.email}</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    style={S.field}
                  />
                </label>
              </div>

              <label style={S.labelLater}>
                <span style={S.labelText}>{c.message}</span>
                <textarea
                  name="message"
                  rows={3}
                  required
                  placeholder={c.messagePlaceholder(productName)}
                  style={S.textarea}
                />
              </label>

              {state.status === 'error' && (
                <p role="alert" style={S.error}>
                  {state.message}
                </p>
              )}

              {/* 這顆按鈕壓在青色面板上，所以是 ink 底而不是品牌青（mockup4） */}
              <button
                type="submit"
                disabled={pending}
                style={S.submit}
                className="disabled:opacity-60"
              >
                {pending ? c.sending : c.send}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
