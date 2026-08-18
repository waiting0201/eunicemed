import Link from 'next/link';
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
    <div className="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-[20px] border border-[--color-hairline] bg-[--color-tint] p-7">
      <div>
        <h3 className="text-[1.2rem] font-semibold">{title}</h3>
        <p className="mt-1 max-w-[52ch] text-[0.95rem]">{body}</p>
      </div>
      <Link
        href={`/${locale}/contact`}
        className="shrink-0 rounded-full bg-[--color-brand] px-7 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(0,181,205,.32)] transition hover:bg-[--color-brand-deep] hover:text-white"
      >
        {CONTACT[locale]}
      </Link>
    </div>
  );
}
