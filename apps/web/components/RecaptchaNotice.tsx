'use client';

import { css } from '@/lib/css';
import { recaptchaEnabled } from '@/lib/recaptcha';
import type { Locale } from '@/lib/locale';

/**
 * Google 要求的 reCAPTCHA 聲明。
 *
 * <p>
 * v3 的浮動徽章被 `globals.css` 藏起來了 —— 它固定在右下角，正好疊在本站的浮動
 * 聯絡按鈕上。Google 的品牌規範允許藏徽章，**條件是在表單上明示這段文字並連到
 * 隱私權政策與服務條款**，所以這個元件是必要的，不是裝飾。
 * </p>
 *
 * <p>
 * 沒有 site key 時什麼都不畫 —— 沒接 reCAPTCHA 卻聲稱受它保護是不實陳述。
 * </p>
 */
const COPY: Record<Locale, { before: string; and: string; after: string; privacy: string; terms: string }> = {
  en: {
    before: 'This site is protected by reCAPTCHA and the Google ',
    and: ' and ',
    after: ' apply.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  'zh-TW': {
    before: '本網站受 reCAPTCHA 保護，並適用 Google 的',
    and: '與',
    after: '。',
    privacy: '隱私權政策',
    terms: '服務條款',
  },
};

const S = {
  notice: css`margin-top:12px;font-size:.78rem;line-height:1.5;color:#6B7A80;`,
  link: css`color:#6B7A80;text-decoration:underline;`,
} as const;

export function RecaptchaNotice({ locale }: { locale: Locale }) {
  if (!recaptchaEnabled) return null;

  const c = COPY[locale];

  return (
    <p style={S.notice}>
      {c.before}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={S.link}>
        {c.privacy}
      </a>
      {c.and}
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={S.link}>
        {c.terms}
      </a>
      {c.after}
    </p>
  );
}
