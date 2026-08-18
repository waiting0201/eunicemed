'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/locale';

/**
 * 分享列。LinkedIn 與 email 是純連結，複製網址需要 clipboard API，
 * 所以整塊是 client component（但只有這一小塊，~600B）。
 *
 * ⚠️ 網址在 client 端才組得出來（伺服器端拿不到使用者實際看到的網址，
 * 也不該把 canonical 硬編進按鈕）—— 所以用 `location.href` 而非 props 傳入。
 */
const COPY: Record<Locale, { share: string; linkedin: string; email: string; copy: string; copied: string }> = {
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

export function ShareLinks({ title, locale }: { title: string; locale: Locale }) {
  const [copied, setCopied] = useState(false);
  const c = COPY[locale];

  const href = () => (typeof window === 'undefined' ? '' : window.location.href);

  return (
    <div>
      <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-grey">
        {c.share}
      </p>
      <div className="flex gap-2">
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
  const className =
    'flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-[0.9rem] font-semibold text-brand-deep transition hover:border-brand';

  return as === 'a' ? (
    <a href="#" aria-label={label} title={label} onClick={onClick} className={className}>
      {children}
    </a>
  ) : (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
