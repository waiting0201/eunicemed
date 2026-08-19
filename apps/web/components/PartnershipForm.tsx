'use client';

import { useActionState } from 'react';
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

const FIELD =
  'w-full rounded-xl border border-hairline bg-white px-[13px] py-[11px] text-[0.95rem] text-ink';
const LABEL = 'mb-1.5 block text-[0.82rem] font-[620] text-ink';

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
      <div className="rounded-[18px] bg-white p-7">
        <p role="status" className="text-[0.95rem]">
          {c.thanks}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-[18px] bg-white p-7">
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

      <div className="grid gap-[14px] sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>{c.company}</span>
          <input
            name="company"
            required
            placeholder={c.companyPlaceholder}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>{c.country}</span>
          <input name="country" placeholder={c.countryPlaceholder} className={FIELD} />
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
        <label className="block">
          <span className={LABEL}>{c.type}</span>
          <select name="partnershipType" className={FIELD}>
            {types.map((t, i) => (
              <option key={t.key ?? i} value={t.key ?? t.label}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-[14px] block">
        <span className={LABEL}>{c.message}</span>
        <textarea
          name="message"
          rows={4}
          required
          placeholder={c.messagePlaceholder}
          className={`${FIELD} resize-y`}
        />
      </label>

      {state.status === 'error' && (
        <p role="alert" className="mt-3 text-[0.9rem] text-[#B3261E]">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-full bg-brand px-[30px] py-[13px] text-[0.95rem] font-[620] text-white shadow-[0_8px_22px_rgba(0,150,170,.28)] disabled:opacity-60"
      >
        {pending ? c.sending : submitLabel}
      </button>
    </form>
  );
}
