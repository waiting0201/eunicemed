'use client';

import { css } from '@/lib/css';

import { useState } from 'react';
import type { Locale } from '@/lib/locale';

/**
 * 分享列。LinkedIn 與 email 是純連結，複製網址需要 clipboard API，
 * 所以整塊是 client component（但只有這一小塊，~600B）。
 *
 * ⚠️ 網址在 client 端才組得出來（伺服器端拿不到使用者實際看到的網址，
 * 也不該把 canonical 硬編進按鈕）—— 所以用 `location.href` 而非 props 傳入。
 */
const COPY: Record<
  Locale,
  { share: string; linkedin: string; email: string; copy: string; copied: string }
> = {
  en: {
    share: 'Share',
    linkedin: 'Share on LinkedIn',
    email: 'Share by email',
    copy: 'Copy link',
    copied: 'Link copied',
  },
  'zh-TW': {
    share: '分享',
    linkedin: '分享到 LinkedIn',
    email: '以電子郵件分享',
    copy: '複製連結',
    copied: '已複製連結',
  },
};

/** 樣式逐字取自 mockup4 文章詳情側欄的分享列。 */
const S = {
  label: css`color:#8AA0A6;font-weight:620;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem;padding-bottom:10px;`,
  row: css`display:flex;gap:8px;`,
  button: css`width:38px;height:38px;border:1px solid #DFE9EC;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;font-family:inherit;background:transparent;cursor:pointer;color:#16333B;`,
} as const;

export function ShareLinks({ title, locale }: { title: string; locale: Locale }) {
  const [copied, setCopied] = useState(false);
  const c = COPY[locale];

  const href = () => (typeof window === 'undefined' ? '' : window.location.href);

  return (
    <div>
      <p style={S.label}>{c.share}</p>
      <div style={S.row}>
        <Btn
          as="a"
          label={c.linkedin}
          onClick={(e) => {
            e.preventDefault();
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(href())}`,
              '_blank',
              'noopener',
            );
          }}
        >
          in
        </Btn>

        <Btn
          as="a"
          label={c.email}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(href())}`;
          }}
        >
          @
        </Btn>

        <Btn
          as="button"
          label={copied ? c.copied : c.copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(href());
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              // clipboard 在非 HTTPS 或未授權時會被拒 —— 靜默失敗即可，
              // 旁邊還有兩個可用的分享方式，不值得為此彈一個錯誤訊息。
            }
          }}
        >
          {copied ? '✓' : '↗'}
        </Btn>
      </div>
    </div>
  );
}

function Btn({
  as,
  label,
  onClick,
  children,
}: {
  as: 'a' | 'button';
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  // mockup4：38px 方鈕、12px 圓角、ink 字（不是圓形也不是青字）
  return as === 'a' ? (
    <a
      href="#"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={S.button}
      data-hover="edge"
    >
      {children}
    </a>
  ) : (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={S.button}
      data-hover="edge"
    >
      {children}
    </button>
  );
}
