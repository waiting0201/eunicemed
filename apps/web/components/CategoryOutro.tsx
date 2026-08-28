import Link from 'next/link';
import type { CategoryDetail } from '@/lib/api';
import { css } from '@/lib/css';
import { collectionRule } from '@/lib/collection';

/** 樣式逐字取自 mockup4 分類頁的 §4 SUPPORT LEVELS 與 §5 CTA。 */
const S = {
  levels: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  intro: css`max-width:760px;`,
  numeral: css`color:#8AA0A6;font-weight:500;font-size:1.1rem;`,
  title: css`font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 12px;`,
  grid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:36px;`,
  card: css`border:1px solid #DFE9EC;border-radius:20px;background:#FFFFFF;padding:28px 26px;`,
  cardTitle: css`font-weight:620;font-size:1.15rem;`,
  cardBody: css`font-size:.92rem;margin-top:8px;`,

  cta: css`background:#F5FAFB;padding:clamp(48px,6vw,72px) 0;`,
  ctaInner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);display:flex;flex-wrap:wrap;gap:28px;justify-content:space-between;align-items:center;`,
  ctaCopy: css`max-width:600px;`,
  ctaTitle: css`font-weight:400;font-size:clamp(1.6rem,3vw,2.1rem);`,
  ctaBody: css`margin-top:10px;`,
  ctaRow: css`display:flex;gap:14px;flex-wrap:wrap;`,
  ctaPrimary: css`background:#00B5CD;color:#fff;font-weight:620;padding:12px 28px;border-radius:999px;box-shadow:0 8px 22px rgba(0,150,170,.28);`,
  ctaSecondary: css`border:1px solid #DFE9EC;background:#FFFFFF;font-weight:620;padding:12px 28px;border-radius:999px;`,
} as const;
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
        <section style={S.levels}>
          <div style={S.intro}>
            <span style={S.numeral}>01</span>
            <h2 style={S.title}>{supportLevels!.title}</h2>
            {supportLevels!.lead && <p>{supportLevels!.lead}</p>}
          </div>

          <div style={S.grid} data-r="stack">
            {items.map((level, i) => (
              <div
                key={level.collection?.slug ?? i}
                style={{ ...S.card, ...collectionRule(level.collection?.slug) }}
              >
                {level.collection && <h3 style={S.cardTitle}>{level.collection.name}</h3>}
                {level.body && <p style={S.cardBody}>{level.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={S.cta}>
        <div style={S.ctaInner}>
          <div style={S.ctaCopy}>
            <h2 style={S.ctaTitle}>{c.ctaTitle}</h2>
            <p style={S.ctaBody}>{c.ctaBody}</p>
          </div>
          <div style={S.ctaRow}>
            <Link
              href={`/${locale}/applications`}
              style={S.ctaPrimary}
              className="hover:text-white"
              data-hover="lift-2-white"
            >
              {c.ctaPrimary}
            </Link>
            <Link href={`/${locale}/contact`} style={S.ctaSecondary}>
              {c.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
