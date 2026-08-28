import type { CSSProperties } from 'react';
import { css } from '@/lib/css';

/**
 * mockup4 各頁區段共用的標題：一個灰色的兩位數序號 + 標題。
 * 序號是版型元素而非內容，所以由版面決定，不從 API 來。
 *
 * <p>
 * **序號有四種顏色**，依所在底色決定，呼叫端用 `numeralStyle` 指定：
 * `#9FB4BA`（白／霧白底，17 處）、`#8AA0A6`（分類與應用方案詳情，5 處）、
 * `#7FE0EC`（壓在照片帶上，2 處）、`#0092A8`（首頁 04 與產品詳情，2 處）。
 * </p>
 *
 * <p>
 * 標題的 `margin` 逐頁不同（mockup4 是寫在 h2 自己的 `margin` 上），
 * 所以 `titleStyle` 也由呼叫端給，預設是最常見的那一組。
 * </p>
 */
const S = {
  /** color:#9FB4BA;font-weight:500;font-size:1.1rem; */
  numeral: css`color:#9FB4BA;font-weight:500;font-size:1.1rem;`,
  /** color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 0; */
  title: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.3rem);margin:8px 0 0;`,
} as const;

/** 序號的四種顏色，逐字取自 mockup4。 */
export const NUMERAL = {
  /** 白／霧白底（17 處） */
  default: S.numeral,
  /** 分類頁與應用方案詳情（5 處） */
  muted: css`color:#8AA0A6;font-weight:500;font-size:1.1rem;`,
  /** 壓在照片帶上（2 處） */
  onPhoto: css`color:#7FE0EC;font-weight:500;font-size:1.1rem;`,
  /** 首頁 04 與產品詳情（2 處） */
  accent: css`color:#0092A8;font-weight:500;font-size:1.1rem;`,
} as const;

export function SectionHeading({
  index,
  title,
  numeralStyle = S.numeral,
  titleStyle = S.title,
  style,
  className,
  titleClassName,
}: {
  index: number;
  title: string;
  numeralStyle?: CSSProperties;
  titleStyle?: CSSProperties;
  style?: CSSProperties;
  /** @deprecated 尚未照抄 mockup4 的頁面暫用。該頁移植完就拿掉。 */
  className?: string;
  /** @deprecated 同上。 */
  titleClassName?: string;
}) {
  return (
    <div style={style} className={className}>
      <span style={numeralStyle}>{String(index).padStart(2, '0')}</span>
      {/* titleStyle 已帶 margin；未移植的頁面仍以 class 覆寫字級 */}
      <h2 style={titleClassName ? undefined : titleStyle} className={titleClassName}>
        {title}
      </h2>
    </div>
  );
}

const R = {
  /** display:flex;align-items:baseline;justify-content:space-between;border-bottom:1.5px solid #DFE9EC;padding-bottom:18px;gap:20px; */
  row: css`display:flex;align-items:baseline;justify-content:space-between;border-bottom:1.5px solid #DFE9EC;padding-bottom:18px;gap:20px;`,
  /** color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.4rem); */
  title: css`color:#16333B;font-weight:400;font-size:clamp(1.8rem,3.4vw,2.4rem);`,
  /** color:#9FB4BA;font-weight:500;font-size:1.1rem;vertical-align:top;margin-right:12px; */
  numeral: css`color:#9FB4BA;font-weight:500;font-size:1.1rem;vertical-align:top;margin-right:12px;`,
} as const;

/**
 * 首頁專用的區段標題：序號與標題**同一行**，底下一條分隔線，右側放「看全部」連結。
 *
 * <p>
 * mockup4 只有首頁的 01 與 05 用這個形狀，其他頁維持序號在標題上方的堆疊式
 * （<see cref="SectionHeading"/>）—— 所以是兩個元件而不是一個加旗標。
 * 兩處的 `margin-bottom` 不同（01 是 36px、05 是 12px），由呼叫端以 `style` 給。
 * </p>
 */
export function RuledSectionHeading({
  index,
  title,
  action,
  style,
  className,
}: {
  index: number;
  title: string;
  /** 右側連結，通常是「All news →」 */
  action?: React.ReactNode;
  style?: CSSProperties;
  /** @deprecated 尚未照抄 mockup4 的頁面暫用。該頁移植完就拿掉。 */
  className?: string;
}) {
  return (
    <div style={{ ...R.row, ...style }} className={className}>
      <h2 style={R.title}>
        <span style={R.numeral}>{String(index).padStart(2, '0')}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}
