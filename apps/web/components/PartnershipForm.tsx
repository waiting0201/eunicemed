'use client';

import { useActionState } from 'react';
import { css } from '@/lib/css';
import { submitContact, type ContactState } from '@/app/[locale]/contact/actions';
import type { Locale } from '@/lib/locale';

/**
 * mockup4 Partnership §03 裡的白色表單卡。欄位照版型：
 * 公司／國家／Email／合作型態併成兩欄，訊息佔滿寬。
 *
 * 送件與 Contact 頁走同一支 server action，只差 `type=partnership`
 * （docs/05 的 `ContactSubmission.Type`）。
 */
const COPY: Record<
  Locale,
  {
    company: string;
    companyPlaceholder: string;
    country: string;
    countryPlaceholder: string;
    email: string;
    type: string;
    message: string;
    messagePlaceholder: string;
    sending: string;
    thanks: string;
  }
> = {
  en: {
    company: 'Company',
    companyPlaceholder: 'Company name',
    country: 'Country',
    countryPlaceholder: 'Country',
    email: 'Email',
    type: 'Partnership type',
    message: 'Message',
    messagePlaceholder: 'Tell us about your business',
    sending: 'Sending…',
    thanks: 'Thank you — we will be in touch within two working days.',
  },
  'zh-TW': {
    company: '公司名稱',
    companyPlaceholder: '公司名稱',
    country: '國家',
    countryPlaceholder: '國家',
    email: '電子郵件',
    type: '合作型態',
    message: '訊息內容',
    messagePlaceholder: '請簡述貴公司的業務',
    sending: '傳送中…',
    thanks: '感謝您的來信，我們會在兩個工作天內與您聯繫。',
  },
};

/**
 * 樣式逐字取自 `mockup4/Partnership.dc.html` §03 的表單卡。
 * 與 Contact 的差別只有卡片內距（28px vs 30px）與欄位是四格兩列。
 */
const S = {
  card: css`background:#FFFFFF;border-radius:18px;padding:28px;`,
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

export function PartnershipForm({
  locale,
  types,
  submitLabel,
}: {
  locale: Locale;
  types: { key?: string; label?: string }[];
  submitLabel: string;
}) {
  const c = COPY[locale];
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, {
    status: 'idle',
  });

  if (state.status === 'ok') {
    return (
      <div style={S.card}>
        <p role="status" style={S.status}>
          {c.thanks}
        </p>
      </div>
    );
  }

  return (
    <form action={action} style={S.card}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="partnership" />
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
          <span style={S.labelText}>{c.company}</span>
          <input name="company" required placeholder={c.companyPlaceholder} style={S.field} />
        </label>
        <label style={S.label}>
          <span style={S.labelText}>{c.country}</span>
          <input name="country" placeholder={c.countryPlaceholder} style={S.field} />
        </label>
        <label style={S.label}>
          <span style={S.labelText}>{c.email}</span>
          <input name="email" type="email" required placeholder="you@company.com" style={S.field} />
        </label>
        <label style={S.label}>
          <span style={S.labelText}>{c.type}</span>
          <select name="partnershipType" style={S.select}>
            {types.map((t, i) => (
              <option key={t.key ?? i} value={t.key ?? t.label}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
        {pending ? c.sending : submitLabel}
      </button>
    </form>
  );
}
