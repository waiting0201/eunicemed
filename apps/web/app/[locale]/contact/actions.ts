'use server';

import { headers } from 'next/headers';
import { isLocale } from '@/lib/locale';

/**
 * 送出聯絡表單。**走 Server Action 而不是瀏覽器直接打 API** ——
 * `API_BASE` 是伺服器端設定（Function App 內部位址），不該出現在公開 bundle，
 * 而且送件端的 IP 要由伺服器決定，不能讓瀏覽器自己報。
 *
 * <p>
 * 送件成功的定義是**入庫成功**，不是寄信成功。SMTP 帳密還沒拿到
 * （CLAUDE.md §7），後端在未設定時跳過寄信但照樣寫進收件匣 ——
 * 表單沒有理由為了一組還沒到手的密碼整支不能用。
 * </p>
 */
export type ContactState =
  | { status: 'idle' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

const MESSAGES = {
  en: {
    required: 'Please fill in your name, email and message.',
    failed: 'We could not send your message. Please email us directly.',
  },
  'zh-TW': {
    required: '請填寫姓名、電子郵件與訊息內容。',
    failed: '訊息送出失敗，請直接來信與我們聯絡。',
  },
} as const;

/**
 * `type` 決定後端怎麼歸類這封來信（docs/05 §ContactSubmission：
 * 0 general / 1 product 詢價 / 2 partnership）。表單用一個隱藏欄位帶過來。
 */
const TYPES = new Set(['general', 'product', 'partnership']);

export async function submitContact(
  _prev: ContactState,
  form: FormData,
): Promise<ContactState> {
  const localeRaw = String(form.get('locale') ?? '');
  const locale = isLocale(localeRaw) ? localeRaw : 'en';
  const t = MESSAGES[locale];

  // 蜜罐：真人看不到這個欄位，填了就是機器人。回 ok 讓對方以為成功。
  if (String(form.get('company_website') ?? '').trim() !== '') return { status: 'ok' };

  const str = (key: string) => {
    const v = String(form.get(key) ?? '').trim();
    return v === '' ? null : v;
  };

  const typeRaw = String(form.get('type') ?? 'general');
  const type = TYPES.has(typeRaw) ? typeRaw : 'general';

  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();
  const subject = String(form.get('subject') ?? '').trim();

  // partnership 的表單問的是公司而不是姓名，兩者擇一即可
  const who = name || str('company') || '';
  if (!who || !email || !message) return { status: 'error', message: t.required };

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const base = process.env.API_BASE ?? 'http://localhost:7071/api';

  try {
    const res = await fetch(`${base}/contact`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        type,
        name: who,
        email,
        subject,
        message,
        locale,
        ipAddress: ip,
        company: str('company'),
        country: str('country'),
        partnershipType: str('partnershipType'),
        productSku: str('productSku'),
      }),
    });

    if (!res.ok) return { status: 'error', message: t.failed };
    return { status: 'ok' };
  } catch {
    return { status: 'error', message: t.failed };
  }
}
