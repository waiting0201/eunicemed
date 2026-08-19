'use client';

import { useActionState } from 'react';
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

const FIELD =
  'w-full rounded-xl border border-hairline bg-white px-[13px] py-[11px] text-[0.95rem] text-ink';
const LABEL = 'mb-1.5 block text-[0.82rem] font-[620] text-ink';

export function ContactForm({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, {
    status: 'idle',
  });

  if (state.status === 'ok') {
    return (
      <div className="relative rounded-[18px] bg-white p-[30px]">
        <h2 className="mb-[18px] text-[1.4rem] font-normal">{c.heading}</h2>
        <p role="status" className="text-[0.95rem]">
          {c.thanks}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="relative rounded-[18px] bg-white p-[30px]">
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

      <h2 className="mb-[18px] text-[1.4rem] font-normal">{c.heading}</h2>

      <div className="grid gap-[14px] sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>{c.name}</span>
          <input name="name" required placeholder={c.namePlaceholder} className={FIELD} />
        </label>
        <label className="block">
          <span className={LABEL}>{c.email}</span>
          <input
            name="email"
            type="email"
            required
            placeholder={c.emailPlaceholder}
            className={FIELD}
          />
        </label>
      </div>

      <label className="mt-[14px] block">
        <span className={LABEL}>{c.subject}</span>
        <select name="subject" className={FIELD}>
          {c.subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>

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
        {pending ? c.sending : c.send}
      </button>
    </form>
  );
}
