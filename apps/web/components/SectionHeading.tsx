/**
 * mockup4 各頁區段共用的標題：一個灰色的兩位數序號 + 標題。
 * 序號是版型元素而非內容，所以由版面決定，不從 API 來。
 */
export function SectionHeading({
  index,
  title,
  accent = false,
  className = '',
}: {
  index: number;
  title: string;
  /** mockup4 的深色底區段把序號改成品牌色 */
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <span
        className={`text-lg font-medium ${accent ? 'text-brand-deep' : 'text-[#9fb4ba]'}`}
      >
        {String(index).padStart(2, '0')}
      </span>
      <h2 className="mt-2 text-[clamp(1.8rem,3.4vw,2.3rem)] font-normal">{title}</h2>
    </div>
  );
}
