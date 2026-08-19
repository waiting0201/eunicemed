'use client';

import { useActionState } from 'react';
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

const FIELD =
  'w-full rounded-xl border border-hairline bg-white px-[13px] py-[11px] text-[0.95rem] text-ink';
const LABEL = 'mb-1.5 block text-[0.82rem] font-[620] text-ink';

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
    <section
      id="inquiry"
      className="mx-auto max-w-content px-gutter py-[clamp(56px,7vw,80px)]"
    >
      <div className="rounded-[26px] bg-[linear-gradient(135deg,#00B5CD_0%,#009DB6_55%,#0092A8_100%)] p-[clamp(36px,5vw,56px)] text-white">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-[clamp(1.8rem,3.4vw,2.3rem)] font-normal text-white">
              {title}
            </h2>
            <p className="mt-3.5 max-w-[36ch] text-white/[.88]">{body}</p>
          </div>

          {state.status === 'ok' ? (
            <div className="rounded-[18px] bg-white p-7 text-body">
              <p role="status" className="text-[0.95rem]">
                {c.thanks}
              </p>
            </div>
          ) : (
            <form action={action} className="rounded-[18px] bg-white p-7 text-body">
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

              <div className="grid gap-[14px] sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL}>{c.name}</span>
                  <input
                    name="name"
                    required
                    placeholder={c.namePlaceholder}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={LABEL}>{c.email}</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    className={FIELD}
                  />
                </label>
              </div>

              <label className="mt-[14px] block">
                <span className={LABEL}>{c.message}</span>
                <textarea
                  name="message"
                  rows={3}
                  required
                  placeholder={c.messagePlaceholder(productName)}
                  className={`${FIELD} resize-y`}
                />
              </label>

              {state.status === 'error' && (
                <p role="alert" className="mt-3 text-[0.9rem] text-[#B3261E]">
                  {state.message}
                </p>
              )}

              {/* 這顆按鈕壓在青色面板上，所以是 ink 底而不是品牌青（mockup4） */}
              <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-full bg-ink px-[30px] py-[13px] text-[0.95rem] font-[620] text-white disabled:opacity-60"
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
