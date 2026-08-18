'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BodyMapSpot } from '@/lib/api';
import type { Locale } from '@/lib/locale';

/**
 * 人體圖。點熱區／膠囊／卡片都會切換右側資訊面板。
 *
 * <p>
 * **人形是版型素材，不是內容** —— 路徑照 mockup4 抄，寫死在這裡。
 * 會動的只有熱區座標：那是每個應用方案自己的 `mapPosition`，由後台維護
 * （docs/09 §人體圖互動規格）。
 * </p>
 *
 * <p>
 * ⚠️ 座標是 **viewBox 260×560 內的值**，與 mockup4 同一組。膠囊是 HTML 而非 SVG
 * （文字要跟著站台字級走），所以用百分比疊在 SVG 上 —— 前提是外框沒有 padding，
 * 否則 SVG 的 box 與疊層對不齊。padding 放在外面那一層。
 * </p>
 */
const VB = { w: 260, h: 560 };

const COPY: Record<Locale, { products: (n: number) => string; fallbackCta: string }> = {
  en: {
    products: (n) => `${n} product${n === 1 ? '' : 's'}`,
    fallbackCta: 'See solutions',
  },
  'zh-TW': {
    products: (n) => `${n} 項產品`,
    fallbackCta: '查看解決方案',
  },
};

export function BodyMap({ spots, locale }: { spots: BodyMapSpot[]; locale: Locale }) {
  // 沒有座標的方案不畫在圖上（後台發布時就擋掉了，這裡是第二道防線）
  const plotted = spots.filter((s) => s.map);
  const [activeSlug, setActiveSlug] = useState(plotted[0]?.slug ?? '');

  if (plotted.length === 0) return null;

  const c = COPY[locale];
  const active = plotted.find((s) => s.slug === activeSlug) ?? plotted[0];

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[440px_1fr] lg:gap-16">
      {/* 人形 + 熱區 + 膠囊 */}
      <div className="rounded-[28px] border border-hairline bg-[linear-gradient(165deg,#fdfefe,#eff7f9)] p-8 shadow-[0_24px_54px_rgba(10,60,72,.08)]">
        <div className="relative">
          <svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            role="group"
            aria-label={locale === 'en' ? 'Interactive body map' : '人體圖互動選單'}
            className="block h-auto w-full"
          >
            <defs>
              <linearGradient id="bm-skin" x1="0" y1="0" x2="0" y2={VB.h} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#D9EBF0" />
                <stop offset="1" stopColor="#B7D5DE" />
              </linearGradient>
              <filter id="bm-soft" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="10" />
              </filter>
            </defs>

            <Figure />

            {/* 選中的部位加一圈柔光 */}
            {active.map && (
              <circle
                cx={active.map.hotspot.cx}
                cy={active.map.hotspot.cy}
                r={42}
                fill="rgba(0,181,205,.28)"
                filter="url(#bm-soft)"
              />
            )}

            {plotted.map((spot) => {
              const on = spot.slug === active.slug;
              return (
                <g
                  key={spot.slug}
                  onClick={() => setActiveSlug(spot.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveSlug(spot.slug);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={spot.name}
                  aria-pressed={on}
                  className="cursor-pointer"
                >
                  <circle
                    cx={spot.map!.hotspot.cx}
                    cy={spot.map!.hotspot.cy}
                    r={15}
                    fill="#fff"
                    stroke={on ? '#00B5CD' : '#BBD3DA'}
                    strokeWidth={on ? 3 : 2}
                  />
                  <circle
                    cx={spot.map!.hotspot.cx}
                    cy={spot.map!.hotspot.cy}
                    r={6.5}
                    fill={on ? '#00B5CD' : '#9FC0C9'}
                  />
                </g>
              );
            })}
          </svg>

          {/* 膠囊：HTML 疊在 SVG 上，位置由 chip 座標換算成百分比 */}
          {plotted.map((spot) => (
            <button
              key={spot.slug}
              type="button"
              onClick={() => setActiveSlug(spot.slug)}
              style={{
                left: `${(spot.map!.chip.cx / VB.w) * 100}%`,
                top: `${(spot.map!.chip.cy / VB.h) * 100}%`,
              }}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.78rem] font-medium shadow-sm transition ${
                spot.slug === active.slug
                  ? 'border-brand bg-white text-brand-deep'
                  : 'border-hairline bg-white/90 hover:border-brand-bright'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_0_4px_rgba(0,181,205,.18)]" />
              {spot.name}
            </button>
          ))}
        </div>
      </div>

      {/* 資訊面板 */}
      <div className="rounded-[20px] border border-hairline bg-white p-8 shadow-[0_18px_44px_rgba(10,60,72,.12)] lg:p-9">
        <p className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-brand-deep">
          {c.products(active.productCount)}
        </p>
        <h3 className="mb-2.5 mt-2 text-[1.8rem] font-normal">{active.name}</h3>
        {active.copy && <p>{active.copy}</p>}

        <Link
          href={active.url}
          className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 font-semibold text-white shadow-[0_8px_22px_rgba(0,150,170,.28)] transition hover:bg-brand-deep hover:text-white"
        >
          {active.ctaLabel ?? c.fallbackCta}
        </Link>

        <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
          {plotted.map((spot) => (
            <button
              key={spot.slug}
              type="button"
              onClick={() => setActiveSlug(spot.slug)}
              className={`rounded-[14px] border p-4 text-left transition ${
                spot.slug === active.slug
                  ? 'border-brand bg-tint'
                  : 'border-hairline hover:border-brand-bright'
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[1.05rem] font-semibold text-ink">
                  {spot.name}
                </span>
                <small className="text-[0.8rem] font-bold text-brand-deep">
                  {spot.productCount}
                </small>
              </span>
              {spot.copy && <span className="mt-1 block text-[0.86rem]">{spot.copy}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 人形。純版型素材，路徑照 mockup4 抄。 */
function Figure() {
  return (
    <g fill="url(#bm-skin)" stroke="url(#bm-skin)" strokeLinecap="round">
      <circle cx="130" cy="52" r="33" stroke="none" />
      <path stroke="none" d="M120 82 L140 82 L142 104 L118 104 Z" />
      <path
        stroke="none"
        d="M130 100 C 106 100 90 108 84 126 C 79 142 80 165 84 190 C 87 210 89 228 89 248 L 171 248 C 171 228 173 210 176 190 C 180 165 181 142 176 126 C 170 108 154 100 130 100 Z"
      />
      <path fill="none" strokeWidth="18" d="M83 128 C 73 160 68 196 66 228 C 65 246 64 258 63 270" />
      <path fill="none" strokeWidth="18" d="M177 128 C 187 160 192 196 194 228 C 195 246 196 258 197 270" />
      <path
        fill="none"
        strokeWidth="26"
        d="M110 248 C 108 302 106 352 108 395 C 110 440 110 482 110 515"
      />
      <path
        fill="none"
        strokeWidth="26"
        d="M150 248 C 152 302 154 352 152 395 C 150 440 150 482 150 515"
      />
      <path stroke="none" d="M96 243 L164 243 L160 268 L100 268 Z" />
      <path fill="none" strokeWidth="16" d="M110 520 L 86 532" />
      <path fill="none" strokeWidth="16" d="M150 520 L 174 532" />
    </g>
  );
}
