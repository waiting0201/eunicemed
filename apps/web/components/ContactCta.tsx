import Link from 'next/link';
import { css } from '@/lib/css';

/** 樣式逐字取自 mockup4 的收尾聯絡卡（FAQ／Where to Buy 共用）。 */
const S = {
  box: css`margin-top:48px;background:#F5FAFB;border:1px solid #DFE9EC;border-radius:20px;padding:32px 36px;display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;`,
  title: css`color:#16333B;font-weight:570;font-size:1.2rem;`,
  body: css`font-size:.95rem;`,
  button: css`display:inline-block;background:#00B5CD;color:#fff;font-weight:620;padding:12px 28px;border-radius:999px;white-space:nowrap;box-shadow:0 8px 22px rgba(0,150,170,.28);`,
} as const;
import type { Locale } from '@/lib/locale';

/**
 * 「找不到答案？」的收尾卡。mockup4 的 FAQ 與 Where to Buy 兩頁末尾共用同一塊。
 * 標題與內文由各頁給（兩頁講的是不同的事），按鈕文字一致。
 */
const CONTACT: Record<Locale, string> = { en: 'Contact us', 'zh-TW': '聯絡我們' };

export function ContactCta({
  locale,
  title,
  body,
}: {
  locale: Locale;
  title: string;
  body: string;
}) {
  return (
    <div style={S.box}>
      <div>
        <h3 style={S.title}>{title}</h3>
        {/* mockup4 這段沒有 margin-top */}
        <p style={S.body}>{body}</p>
      </div>
      <Link href={`/${locale}/contact`} style={S.button} className="hover:text-white">
        {CONTACT[locale]}
      </Link>
    </div>
  );
}
