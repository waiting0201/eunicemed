import type { MediaRef } from '@/lib/api';
import { css } from '@/lib/css';
import { srcSetOf } from '@/lib/image';

/**
 * Hero 輪播。**純 CSS 動畫，沒有 client JS**（docs/09 §2）。
 *
 * <p>
 * ⚠️ **keyframes 依張數在伺服器端產生**，不共用一組。
 * 初版想用「同一組 keyframes + 負的 animation-delay 錯開」，但那要求每張 slide
 * 在動畫週期的**同一個位置**顯示，而各張的顯示窗其實落在 `[i/n, (i+1)/n)`——
 * 位置不同，共用不了。硬寫死百分比只有在某個特定張數下看起來正常，
 * 換成 2 張或 5 張就會出現全黑或兩張疊著的空窗。
 * </p>
 *
 * <p>
 * `prefers-reduced-motion` 時：globals.css 已把所有 animation 關掉，
 * 而第一張的靜態 opacity 是 1、其餘為 0，所以自然停在第一張。
 * </p>
 */

/** 樣式逐字取自 `mockup4/Home.dc.html` 的 HERO SLIDER。 */
const S = {
  section: css`position:relative;overflow:hidden;height:clamp(380px,37.5vw,960px);`,
  slide: css`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;`,
  dots: css`position:absolute;left:50%;transform:translateX(-50%);bottom:18px;display:flex;gap:8px;z-index:2;`,
  /**
   * ⚠️ 圓點是 **26×4px 的藥丸**加一圈 1px 環形陰影，不是小圓點；
   * 作用中為品牌青 `#00B5CD`，其餘為 `rgba(255,255,255,.6)`（由 keyframes 切換）。
   */
  dot: css`width:26px;height:4px;border-radius:999px;box-shadow:0 0 0 1px rgba(10,40,50,.22);`,
  dotIdle: css`background:rgba(255,255,255,.6);`,
  slideHidden: css`opacity:0;`,
} as const;
export function HeroSlider({
  slides,
  intervalSeconds = 6,
}: {
  slides: { image?: MediaRef; alt?: string }[];
  intervalSeconds?: number;
}) {
  const withImage = slides.filter((s): s is { image: MediaRef; alt?: string } => Boolean(s.image));
  if (withImage.length === 0) return null;

  const n = withImage.length;
  const animated = n > 1;
  const total = n * intervalSeconds;
  const keyframes = animated ? keyframesFor(n) : '';

  // 8:3 但有上下界：37.5vw 就是 8:3，clamp 讓它在窄螢幕不會縮成一條
  // （aspect-[8/3] 在手機上只剩 140px 高）、在超寬螢幕不會佔滿整個視窗
  return (
    <section style={S.section}>
      {animated && <style>{keyframes}</style>}

      {withImage.map((slide, i) => (
        <img
          key={slide.image.url}
          src={slide.image.url}
          srcSet={srcSetOf(slide.image)}
          sizes="100vw"
          alt={slide.alt ?? slide.image.alt ?? ''}
          // 第一張是 LCP，不 lazy
          loading={i === 0 ? undefined : 'lazy'}
          decoding="async"
          width={2560}
          height={960}
          style={{
            ...S.slide,
            ...(animated ? { animation: `em-slide-${n}-${i} ${total}s linear infinite` } : null),
            ...(animated && i > 0 ? S.slideHidden : null),
          }}
        />
      ))}

      {animated && (
        <div style={S.dots}>
          {withImage.map((slide, i) => (
            <span
              key={slide.image.url}
              aria-hidden
              style={{
                ...S.dot,
                ...(i > 0 ? S.dotIdle : null),
                animation: `em-dot-${n}-${i} ${total}s linear infinite`,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * 第 i 張在週期的 `[i/n, (i+1)/n)` 顯示，兩端各留一小段淡入淡出。
 * 最後一張要跨過 100%／0% 的接縫，所以它的 keyframes 形狀不同 —— 分開處理。
 */
function keyframesFor(n: number): string {
  const fade = Math.min(4, 100 / n / 4); // 轉場佔比，張數多時自動縮短
  const blocks: string[] = [];

  for (let i = 0; i < n; i++) {
    const start = (i * 100) / n;
    const end = ((i + 1) * 100) / n;
    const p = (v: number) => `${Math.max(0, Math.min(100, v)).toFixed(3)}%`;

    blocks.push(
      i === 0
        ? // 第一張：週期起點就是可見的，尾端淡出
          `@keyframes em-slide-${n}-0{0%,${p(end - fade)}{opacity:1}${p(end)},100%{opacity:0}}`
        : `@keyframes em-slide-${n}-${i}{0%,${p(start)}{opacity:0}${p(start + fade)},${p(end - fade)}{opacity:1}${p(end)},100%{opacity:0}}`,
    );

    // 圓點不做淡出，切換即可。作用中是品牌青，其餘半透明白 —— 值取自 mockup4 的 heroDot
    const ON = '#00B5CD';
    const OFF = 'rgba(255,255,255,.6)';
    blocks.push(
      i === 0
        ? `@keyframes em-dot-${n}-0{0%,${p(end)}{background:${ON}}${p(end + 0.01)},100%{background:${OFF}}}`
        : `@keyframes em-dot-${n}-${i}{0%,${p(start)}{background:${OFF}}${p(start + 0.01)},${p(end)}{background:${ON}}${p(end + 0.01)},100%{background:${OFF}}}`,
    );
  }

  return blocks.join('');
}
