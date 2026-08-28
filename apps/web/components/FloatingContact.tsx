'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css } from '@/lib/css';
import type { Locale } from '@/lib/locale';

/**
 * 右下角的浮動聯絡鈕。mockup4 的**每一頁**都有這顆，
 * 是 Weypro 提案裡「諮詢導流」的主要入口（CLAUDE.md §1）。
 *
 * <p>
 * 提案另標了 AI Agent，V1 不做；這顆先只連 Contact，位置與尺寸已預留。
 * </p>
 *
 * <p>
 * **Contact 頁自己不放這顆** —— mockup4 的 18 頁裡只有 `Contact.dc.html` 沒有它。
 * 已經在聯絡頁了還浮一顆「聯絡我們」，是多餘的重複入口。
 * </p>
 */
/** 樣式逐字取自 mockup4（17/18 頁都有；只有 Contact 自己那頁沒放，見 allow.json）。 */
const S = {
  fab: css`position:fixed;right:26px;bottom:26px;z-index:60;width:56px;height:56px;border-radius:50%;background:#00B5CD;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 28px rgba(0,120,140,.4);`,
} as const;

const LABEL: Record<Locale, string> = { en: 'Contact us', 'zh-TW': '聯絡我們' };

export function FloatingContact({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  if (pathname === `/${locale}/contact`) return null;

  return (
    <Link
      href={`/${locale}/contact`}
      aria-label={LABEL[locale]}
      style={S.fab}
      className="hover:text-white"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M4 6h16v12H7l-3 3z" />
      </svg>
    </Link>
  );
}
