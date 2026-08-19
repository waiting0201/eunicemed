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
    <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-[20px] border border-hairline bg-tint px-9 py-8">
      <div>
        <h3 className="text-[1.2rem] font-[570]">{title}</h3>
        <p className="mt-1 max-w-[52ch] text-[0.95rem]">{body}</p>
      </div>
      <Link
        href={`/${locale}/contact`}
        className="shrink-0 rounded-full bg-brand px-7 py-3 font-[620] whitespace-nowrap text-white shadow-[0_8px_22px_rgba(0,150,170,.28)] hover:text-white"
      >
        {CONTACT[locale]}
      </Link>
    </div>
  );
}
