'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css } from '@/lib/css';
import { type Locale } from '@/lib/locale';
import { LocaleSwitch } from './LocaleSwitch';

/**
 * 手機版導覽。
 *
 * <p>
 * ⚠️ **mockup4 完全沒有手機版頁首** —— 18 頁的導覽都是桌機那一列，
 * 沒有漢堡鈕、沒有抽屜。所以這一支不是照抄，是現場設計的，
 * 但沿用版型既有的語彙：76px 的頁首高度、`#DFE9EC` 細線、
 * 品牌青的作用色、藥丸鈕、以及頁尾那面 `#14262C` 的深色。
 * </p>
 *
 * <p>
 * 桌機完全不渲染它（`data-r="only-mobile"`，見 globals.css）——
 * 桌機版的 `SiteNav` 才是照抄 mockup4 的那一份。
 * </p>
 *
 * <p>
 * ⚠️ **抽屜與遮罩用 portal 掛到 `<body>`，不能留在 `<header>` 裡。**
 * 頁首有 `backdrop-filter:blur(10px)`（照抄自 mockup4），而 `backdrop-filter`
 * 會讓該元素成為 `position:fixed` 子孫的**包含塊** —— 留在裡面的話，
 * `inset:76px 0 0` 會相對於 76px 高的頁首解析，遮罩高度直接變成 0（實測過）。
 * </p>
 */
const S = {
  toggle: css`display:none;margin-left:auto;width:44px;height:44px;flex:0 0 auto;align-items:center;justify-content:center;border:1px solid #DFE9EC;border-radius:12px;background:#FFFFFF;color:#16333B;cursor:pointer;padding:0;`,
  bars: css`display:block;width:20px;height:2px;background:currentColor;border-radius:2px;position:relative;`,

  /** 抽屜貼在頁首下緣（76px），高度自撐、內容過長可捲 */
  panel: css`position:fixed;left:0;right:0;top:76px;z-index:45;background:#FFFFFF;border-bottom:1px solid #DFE9EC;box-shadow:0 18px 44px rgba(10,60,72,.12);max-height:calc(100dvh - 76px);overflow-y:auto;padding:8px clamp(24px,5vw,64px) 20px;`,
  /** 蓋住其餘內容，點一下關閉 */
  scrim: css`position:fixed;inset:76px 0 0;z-index:44;background:rgba(10,38,45,.32);border:none;padding:0;cursor:pointer;`,

  list: css`display:flex;flex-direction:column;`,
  link: css`display:block;padding:14px 0;font-size:1.05rem;font-weight:500;color:#16333B;border-bottom:1px solid #DFE9EC;`,
  linkOn: css`display:block;padding:14px 0;font-size:1.05rem;font-weight:620;color:#0092A8;border-bottom:1px solid #DFE9EC;`,

  footer: css`display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:18px;`,
  buy: css`display:inline-block;background:#00B5CD;color:#fff;font-weight:620;font-size:.95rem;padding:11px 26px;border-radius:999px;`,
  locale: css`color:#7A8B90;font-size:.95rem;`,
  localeCurrent: css`color:#16333B;`,
} as const;

export function MobileNav({
  locale,
  items,
  buy,
}: {
  locale: Locale;
  items: { href: string; label: string }[];
  buy?: { href: string; label: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // portal 只能在掛載後用（SSR 沒有 document）
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 換頁就收起來 —— 抽屜是 fixed 的，留著會蓋住新頁面
  useEffect(() => setOpen(false), [pathname]);

  // 開著的時候鎖住背景捲動，並讓 Esc 可以關
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label =
    locale === 'en' ? (open ? 'Close menu' : 'Open menu') : open ? '關閉選單' : '開啟選單';

  return (
    <>
      <button
        type="button"
        data-r="only-mobile"
        style={S.toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <Glyph open={open} />
      </button>

      {open &&
        mounted &&
        createPortal(
          <>
            <button
              type="button"
              style={S.scrim}
              aria-label={label}
              tabIndex={-1}
              onClick={() => setOpen(false)}
            />
            <nav id="mobile-nav" style={S.panel}>
              <div style={S.list}>
                {items.map((item) => {
                  const href = `/${locale}${item.href}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      style={active ? S.linkOn : S.link}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div style={S.footer}>
                {buy && (
                  <Link href={`/${locale}${buy.href}`} style={S.buy} className="hover:text-white">
                    {buy.label}
                  </Link>
                )}
                <span style={S.locale}>
                  <LocaleSwitch locale={locale} currentStyle={S.localeCurrent} />
                </span>
              </div>
            </nav>
          </>,
          document.body,
        )}
    </>
  );
}

/** 三條線／叉。純裝飾，語意在按鈕的 aria-label 上。 */
function Glyph({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}
