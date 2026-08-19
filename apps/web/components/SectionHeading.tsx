/**
 * mockup4 各頁區段共用的標題：一個灰色的兩位數序號 + 標題。
 * 序號是版型元素而非內容，所以由版面決定，不從 API 來。
 */
export function SectionHeading({
  index,
  title,
  accent = false,
  className = '',
  titleClassName = 'text-[clamp(1.8rem,3.4vw,2.3rem)]',
}: {
  index: number;
  title: string;
  /** mockup4 的深色底區段把序號改成品牌色 */
  accent?: boolean;
  className?: string;
  /** 標題字級。多數頁面是 `clamp(1.8rem,3.4vw,2.3rem)`，About 整頁大一階 */
  titleClassName?: string;
}) {
  return (
    <div className={className}>
      <span
        className={`text-[1.1rem] font-medium ${accent ? 'text-brand-deep' : 'text-[#9fb4ba]'}`}
      >
        {String(index).padStart(2, '0')}
      </span>
      <h2 className={`mt-2 font-normal ${titleClassName}`}>{title}</h2>
    </div>
  );
}

/**
 * 首頁專用的區段標題：序號與標題**同一行**，底下一條分隔線，右側放「看全部」連結。
 *
 * <p>
 * mockup4 只有首頁的 01 與 05 用這個形狀，其他頁維持序號在標題上方的堆疊式
 * （<see cref="SectionHeading"/>）—— 所以是兩個元件而不是一個加旗標。
 * </p>
 */
export function RuledSectionHeading({
  index,
  title,
  action,
  className = '',
}: {
  index: number;
  title: string;
  /** 右側連結，通常是「All products →」 */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-5 border-b-[1.5px] border-hairline pb-[18px] ${className}`}
    >
      <h2 className="text-[clamp(1.8rem,3.4vw,2.4rem)] font-normal">
        <span className="mr-3 align-top text-[1.1rem] font-medium text-[#9fb4ba]">
          {String(index).padStart(2, '0')}
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}
