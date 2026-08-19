import Link from 'next/link';
import type { Locale } from '@/lib/locale';

/**
 * 右下角的浮動聯絡鈕。mockup4 的**每一頁**都有這顆，
 * 是 Weypro 提案裡「諮詢導流」的主要入口（CLAUDE.md §1）。
 *
 * <p>
 * 提案另標了 AI Agent，V1 不做；這顆先只連 Contact，位置與尺寸已預留。
 * </p>
 */
const LABEL: Record<Locale, string> = { en: 'Contact us', 'zh-TW': '聯絡我們' };

export function FloatingContact({ locale }: { locale: Locale }) {
  return (
    <Link
      href={`/${locale}/contact`}
      aria-label={LABEL[locale]}
      className="fixed right-[26px] bottom-[26px] z-60 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_28px_rgba(0,120,140,.4)] hover:text-white"
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
