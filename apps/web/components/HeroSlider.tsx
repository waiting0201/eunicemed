import type { MediaRef } from '@/lib/api';
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
export function HeroSlider({
  slides,
  intervalSeconds = 6,
}: {
  slides: { image?: MediaRef; alt?: string }[];
  intervalSeconds?: number;
}) {
  const withImage = slides.filter(
    (s): s is { image: MediaRef; alt?: string } => Boolean(s.image),
  );
  if (withImage.length === 0) return null;

  const n = withImage.length;
  const animated = n > 1;
  const total = n * intervalSeconds;
  const css = animated ? keyframesFor(n) : '';

  return (
    <section className="relative aspect-[8/3] w-full overflow-hidden bg-tint-deep">
      {animated && <style>{css}</style>}

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
          style={animated ? { animation: `em-slide-${n}-${i} ${total}s linear infinite` } : undefined}
          className={`absolute inset-0 h-full w-full object-cover ${
            animated && i > 0 ? 'opacity-0' : ''
          }`}
        />
      ))}

      {animated && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {withImage.map((slide, i) => (
            <span
              key={slide.image.url}
              aria-hidden
              style={{ animation: `em-dot-${n}-${i} ${total}s linear infinite` }}
              className="h-2 w-2 rounded-full bg-white/50"
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

    // 圓點不做淡出，切換即可
    blocks.push(
      i === 0
        ? `@keyframes em-dot-${n}-0{0%,${p(end)}{background-color:rgb(255 255 255/.95)}${p(end + 0.01)},100%{background-color:rgb(255 255 255/.5)}}`
        : `@keyframes em-dot-${n}-${i}{0%,${p(start)}{background-color:rgb(255 255 255/.5)}${p(start + 0.01)},${p(end)}{background-color:rgb(255 255 255/.95)}${p(end + 0.01)},100%{background-color:rgb(255 255 255/.5)}}`,
    );
  }

  return blocks.join('');
}
