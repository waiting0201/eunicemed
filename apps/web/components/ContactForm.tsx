'use client';

import { useActionState } from 'react';
import { css } from '@/lib/css';
import { submitContact, type ContactState } from '@/app/[locale]/contact/actions';
import type { Locale } from '@/lib/locale';

/**
 * mockup4 Contact 頁右側的白色表單卡。欄位與版位逐項照版型：
 * 姓名／Email 併成兩欄，主旨與訊息各佔滿寬。
 *
 * <p>
 * **`input` 明確指定深字白底** —— mockup2 那版沿用了深色主題的近白文字，
 * 壓在瀏覽器預設白底上完全看不見（DESIGN.md「一併修掉的問題」第一條）。
 * </p>
 */
const COPY: Record<
  Locale,
  {
    heading: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    subject: string;
    subjects: string[];
    message: string;
    messagePlaceholder: string;
    send: string;
    sending: string;
    thanks: string;
  }
> = {
  en: {
    heading: 'Send a message',
    name: 'Name',
    namePlaceholder: 'Your name',
    email: 'Email',
    emailPlaceholder: 'you@email.com',
    subject: 'Subject',
    subjects: ['Product question', 'Sizing help', 'Partnership', 'Other'],
    message: 'Message',
    messagePlaceholder: 'How can we help?',
    send: 'Send message',
    sending: 'Sending…',
    thanks: 'Thank you — we have received your message and will reply shortly.',
  },
  'zh-TW': {
    heading: '傳送訊息',
    name: '姓名',
    namePlaceholder: '您的姓名',
    email: '電子郵件',
    emailPlaceholder: 'you@email.com',
    subject: '主旨',
    subjects: ['產品諮詢', '尺寸協助', '合作洽談', '其他'],
    message: '訊息內容',
    messagePlaceholder: '有什麼我們可以協助的？',
    send: '送出訊息',
    sending: '傳送中…',
    thanks: '感謝您的來信，我們已收到訊息並會盡快回覆。',
  },
};

/**
 * 樣式逐字取自 `mockup4/Contact.dc.html` 的表單卡。
 * mockup4 的 `<select>` 另外指定 `background:#fff` —— 深色系統主題下瀏覽器
 * 會給下拉選單暗底，不寫死就會出現深底深字。
 */
const S = {
  card: css`position:relative;background:#FFFFFF;border-radius:18px;padding:30px;`,
  heading: css`color:#16333B;font-weight:400;font-size:1.4rem;margin-bottom:18px;`,
  pair: css`display:grid;grid-template-columns:1fr 1fr;gap:14px;`,
  label: css`display:block;`,
  labelLater: css`display:block;margin-top:14px;`,
  labelText: css`display:block;font-size:.82rem;font-weight:620;color:#16333B;margin-bottom:6px;`,
  field: css`width:100%;border:1px solid #DFE9EC;border-radius:12px;padding:11px 13px;font-size:.95rem;color:#16333B;`,
  select: css`width:100%;border:1px solid #DFE9EC;border-radius:12px;padding:11px 13px;font-size:.95rem;color:#16333B;background:#fff;`,
  textarea: css`width:100%;border:1px solid #DFE9EC;border-radius:12px;padding:11px 13px;font-size:.95rem;color:#16333B;resize:vertical;`,
  submit: css`margin-top:16px;background:#00B5CD;color:#fff;border:none;font-family:inherit;font-weight:620;font-size:.95rem;padding:13px 30px;border-radius:999px;cursor:pointer;box-shadow:0 8px 22px rgba(0,150,170,.28);`,
  /** 錯誤訊息是本站補的：mockup4 的表單不會送出 */
  error: css`margin-top:12px;font-size:.9rem;color:#B3261E;`,
  status: css`font-size:.95rem;`,
} as const;

export function ContactForm({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, {
    status: 'idle',
  });

  if (state.status === 'ok') {
    return (
      <div style={S.card}>
        <h2 style={S.heading}>{c.heading}</h2>
        <p role="status" style={S.status}>
          {c.thanks}
        </p>
      </div>
    );
  }

  return (
    <form action={action} style={S.card}>
      <input type="hidden" name="locale" value={locale} />
      {/* 蜜罐 —— 對讀屏也隱藏，只有機器人會填 */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <h2 style={S.heading}>{c.heading}</h2>

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
            placeholder={c.emailPlaceholder}
            style={S.field}
          />
        </label>
      </div>

      <label style={S.labelLater}>
        <span style={S.labelText}>{c.subject}</span>
        <select name="subject" style={S.select}>
          {c.subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>

      <label style={S.labelLater}>
        <span style={S.labelText}>{c.message}</span>
        <textarea
          name="message"
          rows={4}
          required
          placeholder={c.messagePlaceholder}
          style={S.textarea}
        />
      </label>

      {state.status === 'error' && (
        <p role="alert" style={S.error}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} style={S.submit} className="disabled:opacity-60">
        {pending ? c.sending : c.send}
      </button>
    </form>
  );
}
