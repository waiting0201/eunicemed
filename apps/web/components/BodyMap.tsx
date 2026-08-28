'use client';

import { css } from '@/lib/css';

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

/**
 * 樣式逐字取自 `mockup4/Applications.dc.html`。熱點的 glow／ring／core 與 chip、
 * 部位卡的選取狀態，在 mockup4 是 `data-dc-script` 裡的 JS 物件，這裡照它的值搬過來。
 */
const POP = 'cubic-bezier(0.34,1.56,0.64,1)';
const OUT = 'cubic-bezier(0.22,1,0.36,1)';

const S = {
  grid: css`display:grid;grid-template-columns:440px 1fr;gap:64px;align-items:center;`,
  figure: css`position:relative;background:linear-gradient(165deg,#FDFEFE,#EFF7F9);border:1px solid #DFE9EC;border-radius:28px;padding:34px 30px;box-shadow:0 24px 54px rgba(10,60,72,.08);`,
  svg: css`width:100%;height:auto;display:block;`,
  hotspot: css`cursor:pointer;`,
  /** 熱點外環的脈動（mockup4 的 `.pulse`） */
  ripple: css`fill:none;stroke:#00B5CD;stroke-width:2;transform-origin:center;transform-box:fill-box;animation:ripple 2.6s cubic-bezier(.22,1,.36,1) infinite;`,

  /** ring／core 的選取變形，值取自 mockup4 script 裡的 `ring()` / `core()` */
  ring: css`transform-origin:center;transform-box:fill-box;transform:scale(1);opacity:.55;`,
  ringOn: css`transform-origin:center;transform-box:fill-box;transform:scale(1.45);opacity:.9;`,
  core: css`transform-origin:center;transform-box:fill-box;transform:scale(1);`,
  coreOn: css`transform-origin:center;transform-box:fill-box;transform:scale(1.2);`,
  chipDot: css`width:9px;height:9px;border-radius:50%;background:#00B5CD;box-shadow:0 0 0 4px rgba(0,181,205,.18);`,

  panel: css`border:1px solid #DFE9EC;border-radius:20px;background:#FFFFFF;padding:34px 36px;box-shadow:0 18px 44px rgba(10,60,72,.12);`,
  panelEyebrow: css`color:#0092A8;font-weight:680;letter-spacing:.14em;text-transform:uppercase;font-size:.78rem;`,
  panelTitle: css`color:#16333B;font-weight:400;font-size:1.8rem;margin:8px 0 10px;`,
  panelBody: css`font-size:.86rem;`,
  panelCta: css`display:inline-block;margin-top:22px;background:#00B5CD;color:#fff;font-weight:620;padding:11px 26px;border-radius:999px;box-shadow:0 8px 22px rgba(0,150,170,.28);`,
  cards: css`display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:26px;`,
  cardHead: css`display:flex;justify-content:space-between;align-items:baseline;font-size:1.05rem;color:#16333B;font-weight:570;`,
  cardCount: css`color:#0092A8;font-weight:700;font-size:.8rem;`,
} as const;

/** chip：白玻璃藥丸，選中時翻成品牌青並上浮。 */
const CHIP_BASE = css`position:absolute;display:inline-flex;align-items:center;gap:9px;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border:1px solid #DFE9EC;border-radius:999px;padding:9px 16px;font-size:.82rem;font-weight:620;color:#16333B;box-shadow:0 10px 26px rgba(10,60,72,.16);white-space:nowrap;cursor:pointer;transition:transform .3s ${POP}, box-shadow .3s ${OUT}, background .25s ease;`;

const CHIP_ON = css`background:#00B5CD;color:#fff;border-color:#00B5CD;box-shadow:0 14px 30px rgba(0,140,160,.35);`;

/** 右側的部位卡。 */
const CARD_BASE = css`border:1.5px solid #DFE9EC;border-radius:16px;padding:18px 20px;cursor:pointer;background:#FFFFFF;text-align:left;font-family:inherit;transition:transform .35s ${POP}, border-color .25s ease, box-shadow .3s ${OUT}, background .25s ease;`;

const CARD_ON = css`border-color:#00B5CD;background:rgba(0,181,205,.16);box-shadow:0 12px 28px rgba(0,140,160,.3);`;

export function BodyMap({ spots, locale }: { spots: BodyMapSpot[]; locale: Locale }) {
  // 沒有座標的方案不畫在圖上（後台發布時就擋掉了，這裡是第二道防線）
  const plotted = spots.filter((s) => s.map);
  const [activeSlug, setActiveSlug] = useState(plotted[0]?.slug ?? '');

  if (plotted.length === 0) return null;

  const c = COPY[locale];
  const active = plotted.find((s) => s.slug === activeSlug) ?? plotted[0];

  return (
    <div style={S.grid}>
      {/* 人形 + 熱區 + 膠囊 */}
      <div style={S.figure}>
        <div style={{ position: 'relative' }}>
          <svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            role="group"
            aria-label={locale === 'en' ? 'Interactive body map' : '人體圖互動選單'}
            style={S.svg}
          >
            <defs>
              <linearGradient
                id="bm-skin"
                x1="0"
                y1="0"
                x2="0"
                y2={VB.h}
                gradientUnits="userSpaceOnUse"
              >
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
                  style={S.hotspot}
                >
                  {/* 選中的熱點外環持續脈動（mockup4 的 `.pulse` + `@keyframes ripple`） */}
                  {on && (
                    <circle
                      cx={spot.map!.hotspot.cx}
                      cy={spot.map!.hotspot.cy}
                      r={15}
                      style={S.ripple}
                    />
                  )}
                  <circle
                    cx={spot.map!.hotspot.cx}
                    cy={spot.map!.hotspot.cy}
                    r={15}
                    fill="none"
                    stroke="#00B5CD"
                    strokeWidth={2}
                    style={on ? S.ringOn : S.ring}
                  />
                  <circle
                    cx={spot.map!.hotspot.cx}
                    cy={spot.map!.hotspot.cy}
                    r={6.5}
                    fill="#fff"
                    stroke="#00B5CD"
                    strokeWidth={5.5}
                    style={on ? S.coreOn : S.core}
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
              data-r="hide-narrow"
              style={{
                ...CHIP_BASE,
                WebkitBackdropFilter: 'blur(6px)',
                // 座標由後台維護，換算成百分比疊在 SVG 上；mockup4 是寫死的四組
                left: `${(spot.map!.chip.cx / VB.w) * 100}%`,
                top: `${(spot.map!.chip.cy / VB.h) * 100}%`,
                transform:
                  spot.slug === active.slug
                    ? 'translate(-50%,-50%) translateY(-3px) scale(1.06)'
                    : 'translate(-50%,-50%)',
                ...(spot.slug === active.slug ? CHIP_ON : null),
              }}
            >
              <span style={S.chipDot} />
              {spot.name}
            </button>
          ))}
        </div>
      </div>

      {/* 資訊面板 */}
      <div style={S.panel}>
        <p style={S.panelEyebrow}>{c.products(active.productCount)}</p>
        <h3 style={S.panelTitle}>{active.name}</h3>
        {active.copy && <p>{active.copy}</p>}

        <Link href={active.url} style={S.panelCta} className="hover:text-white">
          {active.ctaLabel ?? c.fallbackCta}
        </Link>

        <div style={S.cards} data-r="cols-2">
          {plotted.map((spot) => (
            <button
              key={spot.slug}
              type="button"
              onClick={() => setActiveSlug(spot.slug)}
              style={{ ...CARD_BASE, ...(spot.slug === active.slug ? CARD_ON : null) }}
            >
              <span style={S.cardHead}>
                <span>{spot.name}</span>
                <small style={S.cardCount}>{spot.productCount}</small>
              </span>
              {spot.copy && (
                <span style={{ ...S.panelBody, display: 'block', marginTop: '4px' }}>
                  {spot.copy}
                </span>
              )}
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
      <path
        fill="none"
        strokeWidth="18"
        d="M83 128 C 73 160 68 196 66 228 C 65 246 64 258 63 270"
      />
      <path
        fill="none"
        strokeWidth="18"
        d="M177 128 C 187 160 192 196 194 228 C 195 246 196 258 197 270"
      />
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
