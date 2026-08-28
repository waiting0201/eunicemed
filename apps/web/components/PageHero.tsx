import { css } from '@/lib/css';

/**
 * 頁首標題塊：eyebrow + h1 + lead，置中。
 * mockup4 的 FAQ / Downloads / Where to Buy / Applications 都是同一組，
 * 所以抽出來 —— 這是版型元素，文案由各頁依語系提供。
 *
 * 版位照 mockup4：`padding: clamp(32px,4vw,48px) clamp(24px,5vw,64px) 0`，
 * 內層 760px 置中。**下方沒有留白** —— 由接在後面的區段自己給。
 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:clamp(32px,4vw,48px) clamp(24px,5vw,64px) 0;`,
  inner: css`max-width:760px;margin:0 auto;text-align:center;`,
  eyebrow: css`color:#0092A8;font-weight:680;letter-spacing:.16em;text-transform:uppercase;font-size:.78rem;`,
  title: css`font-weight:400;font-size:clamp(2rem,3.6vw,2.8rem);letter-spacing:-.02em;margin:10px 0 0;`,
  lead: css`margin-top:14px;font-size:1.1rem;`,
} as const;

export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <section style={S.section}>
      <div style={S.inner}>
        <p style={S.eyebrow}>{eyebrow}</p>
        <h1 style={S.title}>{title}</h1>
        {lead && <p style={S.lead}>{lead}</p>}
      </div>
    </section>
  );
}
