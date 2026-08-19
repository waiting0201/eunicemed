import Link from 'next/link';
import type { CategoryDetail } from '@/lib/api';
import { collectionBorder } from '@/lib/collection';
import type { Locale } from '@/lib/locale';

/**
 * 分類／子分類頁的收尾兩段（mockup4「Product Category」§4 與 §5）：
 * 三種支撐強度的卡片，以及淺底的「不確定哪一種適合」CTA 帶。
 *
 * <p>
 * 卡片頂線用系列的**印刷專色原值**（`--color-*-fill`）——
 * DESIGN.md：填色維持 Pantone 原值，只有當小級數文字時才壓深。
 * </p>
 *
 * 兩頁共用同一份版型，所以抽出來；文案是版型固定字彙，不從 API 來。
 */
const COPY: Record<
  Locale,
  { ctaTitle: string; ctaBody: string; ctaPrimary: string; ctaSecondary: string }
> = {
  en: {
    ctaTitle: 'Not sure which support fits?',
    ctaBody:
      'Start from where it hurts — our applications guide maps each body part to the right product and support level.',
    ctaPrimary: 'Find by body part',
    ctaSecondary: 'Ask our team',
  },
  'zh-TW': {
    ctaTitle: '不確定哪一種支撐適合？',
    ctaBody: '從不舒服的部位開始 —— 應用方案指南會把每個部位對應到合適的產品與支撐強度。',
    ctaPrimary: '依部位尋找',
    ctaSecondary: '詢問我們',
  },
};

export function CategoryOutro({
  supportLevels,
  locale,
}: {
  supportLevels: CategoryDetail['supportLevels'];
  locale: Locale;
}) {
  const c = COPY[locale];
  const items = supportLevels?.items ?? [];

  return (
    <>
      {items.length > 0 && (
        <section className="mx-auto max-w-content px-gutter py-[clamp(56px,7vw,80px)]">
          <div className="max-w-[760px]">
            <span className="text-[1.1rem] font-medium text-[#8AA0A6]">01</span>
            <h2 className="mt-2 mb-3 text-[clamp(1.8rem,3.4vw,2.3rem)] font-normal">
              {supportLevels!.title}
            </h2>
            {supportLevels!.lead && <p>{supportLevels!.lead}</p>}
          </div>

          <div className="mt-9 grid gap-6 lg:grid-cols-3">
            {items.map((level, i) => (
              <div
                key={level.collection?.slug ?? i}
                className={`rounded-[20px] border border-t-4 border-hairline bg-white px-[26px] py-7 ${collectionBorder(
                  level.collection?.slug,
                )}`}
              >
                {level.collection && (
                  <h3 className="text-[1.15rem] font-[620]">{level.collection.name}</h3>
                )}
                {level.body && <p className="mt-2 text-[0.92rem]">{level.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-tint py-[clamp(48px,6vw,72px)]">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-7 px-gutter">
          <div className="max-w-[600px]">
            <h2 className="text-[clamp(1.6rem,3vw,2.1rem)] font-normal">{c.ctaTitle}</h2>
            <p className="mt-2.5">{c.ctaBody}</p>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href={`/${locale}/applications`}
              className="rounded-full bg-brand px-7 py-3 font-[620] text-white shadow-[0_8px_22px_rgba(0,150,170,.28)] hover:text-white"
            >
              {c.ctaPrimary}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="rounded-full border border-hairline bg-white px-7 py-3 font-[620]"
            >
              {c.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
