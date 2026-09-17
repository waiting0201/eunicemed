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
 * **交叉淡入靠的是疊放順序，不是對稱的淡入淡出。**
 * 前一版讓每張各自淡出、下一張再淡入，兩段不重疊 —— 中間有約 1.08 秒
 * 沒有任何一張是不透明的，會透出頁面底色（是「淡出到白再淡入」，不是交叉淡入）。
 * 現在的模型利用「後面的 slide 蓋在前面之上」：
 * </p>
 * <ul>
 *   <li>**第 0 張恆為不透明**，完全不做 opacity 動畫 —— 它是整組的底圖。</li>
 *   <li>**中間張**淡入（疊在還不透明的前一張上）後維持到下一張完全蓋住它，才瞬間歸零。</li>
 *   <li>**最後一張**淡入後維持到週期末，再跨過接縫淡出 —— 底下就是恆亮的第 0 張。</li>
 * </ul>
 * <p>任何時間點都至少有一張不透明的底，所以轉場全程不會透出底色。</p>
 *
 * <p>
 * ⚠️ **不要讓 banner 圖本身位移或縮放。**
 * 2026-09-17 曾加過 Ken Burns（緩慢推近 + 微幅平移），客戶回饋「圖在那邊晃動很暈」——
 * 滿版背景持續位移會觸發 vection（視覺自我運動錯覺），在 8:3 的大面積上特別明顯，
 * 而這是醫療品牌的首屏。同日也試過把圖切成橫帶交錯滑入（條數取自品牌跑道圖形），
 * 客戶最後選擇維持單純的淡入淡出。**要動就動疊在圖上的東西，不要動圖本身。**
 * 見 docs/09 §2。
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

/** 轉場佔每張檔期的比例。n=3 時算出來剛好是 6%，與 mockup4 的 `heroSlide` 逐字相同。 */
const FADE_RATIO = 0.18;

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

  // 8:3 但有上下界：37.5vw 就是 8:3，clamp 讓它在窄螢幕不會縮成一條
  // （aspect-[8/3] 在手機上只剩 140px 高）、在超寬螢幕不會佔滿整個視窗
  return (
    <section style={S.section}>
      {animated && <style>{keyframesFor(n)}</style>}

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
            // 第 0 張是恆亮的底圖，沒有動畫也沒有靜態 opacity（見檔頭）
            ...(animated && i > 0
              ? { ...S.slideHidden, animation: `em-slide-${n}-${i} ${total}s linear infinite` }
              : null),
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
 * 產生這個張數所需的 keyframes：`em-slide-*`（淡入淡出）與 `em-dot-*`（圓點）。
 * 只在 `n > 1` 時呼叫。第 i 張的檔期是 `[i/n, (i+1)/n)`，轉場落在檔期**結束之後**
 * 的 `fade` 內 —— 與 mockup4 的 `heroSlide` 同一個形狀，也是交叉淡入成立的前提。
 */
function keyframesFor(n: number): string {
  const p = (v: number) => `${Math.max(0, Math.min(100, v)).toFixed(3)}%`;
  const fade = (100 / n) * FADE_RATIO;
  const blocks: string[] = [];

  for (let i = 0; i < n; i++) {
    const start = (i * 100) / n;
    const end = ((i + 1) * 100) / n;
    const last = i === n - 1;

    // ── 淡入淡出。第 0 張不做：它恆為不透明，是所有轉場的底。
    if (i > 0) {
      blocks.push(
        last
          ? // 最後一張：跨過 100%／0% 的接縫淡出，露出底下的第 0 張
            `@keyframes em-slide-${n}-${i}{0%{opacity:1}${p(fade)},${p(start)}{opacity:0}${p(start + fade)},100%{opacity:1}}`
          : // 中間張：淡入後一直撐到下一張完全蓋住它（`end + fade`），才瞬間歸零
            `@keyframes em-slide-${n}-${i}{0%,${p(start)}{opacity:0}${p(start + fade)},${p(end + fade)}{opacity:1}${p(end + fade + 0.01)},100%{opacity:0}}`,
      );
    }

    // ── 圓點不做淡出，切換即可。作用中是品牌青，其餘半透明白 —— 值取自 mockup4 的 heroDot
    const ON = '#00B5CD';
    const OFF = 'rgba(255,255,255,.6)';
    blocks.push(
      i === 0
        ? `@keyframes em-dot-${n}-0{0%,${p(end)}{background:${ON}}${p(end + 0.01)},100%{background:${OFF}}}`
        : last
          ? // 最後一顆的熄滅落在 100% 之後。照著寫會產生 `100%` 重複且互相矛盾的
            // offset（`p()` 會 clamp），所以這裡直接省略那一段 —— 它亮到週期末，
            // 下一輪由 0% 的 OFF 接手。
            `@keyframes em-dot-${n}-${i}{0%,${p(start)}{background:${OFF}}${p(start + 0.01)},100%{background:${ON}}}`
          : `@keyframes em-dot-${n}-${i}{0%,${p(start)}{background:${OFF}}${p(start + 0.01)},${p(end)}{background:${ON}}${p(end + 0.01)},100%{background:${OFF}}}`,
    );
  }

  return blocks.join('');
}
