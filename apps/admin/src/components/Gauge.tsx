/**
 * 完整度儀表 —— **這套後台的簽名元素**。
 *
 * <p>
 * 形狀取自壓力襪包裝上的壓力梯度圖：一條由左到右分段填充的軌道。
 * 三段對應 **required / recommended / complete**，
 * 三段是因為品牌把所有東西分三級（Care · Protect · Advance）——
 * 是結構資訊，不是裝飾。
 * </p>
 *
 * <p>
 * 為什麼需要它：這個站的失效模式是靜默。語言純度會讓缺翻譯的內容直接消失，
 * 不報錯。掃過 149 列產品時，整條中文軌是空的 —— 那正是本專案最需要看見的事，
 * 而一般後台的「Draft / Published」標籤看不出來。
 * </p>
 *
 * 色盲友善：填滿與未填的差異是**長度**不是顏色；缺完全必填時額外加一條鏽紅底線。
 */
export type GaugeLevel = 0 | 1 | 2 | 3;

const SEGMENTS = 3;

export function Gauge({
  level,
  label,
  width = 'w-11',
  animateKey,
  onDark = false,
}: {
  /** 0 = 完全沒有內容、3 = 齊全 */
  level: GaugeLevel;
  /** 螢幕閱讀器用的完整描述 —— 視覺上是一條軌，語意上要說得出是什麼 */
  label: string;
  width?: string;
  /** 變動時觸發交錯重繪（切換語系用）。相同值不重播。 */
  animateKey?: string | number;
  /** 放在深色側欄上時，未填段要提亮才看得見 */
  onDark?: boolean;
}) {
  const empty = level === 0;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex ${width} shrink-0 gap-px align-middle`}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const filled = i < level;
        return (
          <span
            key={`${animateKey}-${i}`}
            aria-hidden
            className="h-[3px] flex-1 rounded-[1px]"
            style={{
              background: filled
                ? 'var(--gauge)'
                : onDark
                  ? 'rgb(255 255 255 / 0.22)'
                  : empty
                    ? 'var(--gauge-empty)'
                    : 'var(--border)',
              ...(filled && {
                animation: 'gauge-in 260ms cubic-bezier(.22,1,.36,1) both',
                animationDelay: `${i * 45}ms`,
                transformOrigin: 'left',
              }),
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * 一組雙軌儀表：每個語系一軌。
 * 這是列表列上的預設呈現 —— 兩軌上下疊，像壓力梯度圖的兩條等壓線。
 */
export function LocaleGauges({
  levels,
  labelOf,
  animateKey,
}: {
  levels: Record<string, GaugeLevel>;
  labelOf: (locale: string, level: GaugeLevel) => string;
  animateKey?: string | number;
}) {
  return (
    <span className="inline-flex flex-col gap-[3px]">
      {Object.entries(levels).map(([locale, level]) => (
        <span key={locale} className="inline-flex items-center gap-1.5">
          <span
            className="mono w-9 shrink-0 text-[0.68rem]"
            style={{ color: 'var(--text-muted)' }}
          >
            {locale}
          </span>
          <Gauge level={level} label={labelOf(locale, level)} animateKey={animateKey} />
        </span>
      ))}
    </span>
  );
}
