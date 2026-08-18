import type { ProductDetail } from '@/lib/api';

/**
 * 尺寸表。形狀是 `{measureLabel,sizes:[],rows:[{label?,values:[]}],footnote?}`，
 * 由後台的產品表單自由填寫 —— 所以**每一層都要能吃到缺漏**：
 * 少了 sizes 就整塊不渲染，某列 values 比表頭短就補空格。
 * 版型是格線，欄數對不上會整個垮掉。
 */
export function SizeChart({ chart }: { chart: NonNullable<ProductDetail['sizeChart']> }) {
  const sizes = chart.sizes ?? [];
  if (sizes.length === 0) return null;

  const rows = chart.rows ?? [];
  // 有任何一列帶 label 就多開一欄放列名（例如「小腿圍」「大腿圍」兩列）
  const hasRowLabels = rows.some((r) => r.label);
  const columns = sizes.length + (hasRowLabels ? 1 : 0);

  return (
    <div>
      <div
        className="grid gap-px overflow-hidden rounded-[14px] border border-[--color-hairline] bg-[#edf4f6]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {hasRowLabels && <Cell head />}
        {sizes.map((s) => (
          <Cell key={s} head>
            {s}
          </Cell>
        ))}

        {rows.map((row, i) => (
          <Row
            key={row.label ?? i}
            label={hasRowLabels ? (row.label ?? '') : null}
            values={row.values ?? []}
            width={sizes.length}
          />
        ))}
      </div>

      {chart.footnote && (
        <p className="mt-3 text-[0.82rem] text-[--color-grey]">{chart.footnote}</p>
      )}
    </div>
  );
}

function Row({
  label,
  values,
  width,
}: {
  label: string | null;
  values: string[];
  width: number;
}) {
  return (
    <>
      {label !== null && <Cell head>{label}</Cell>}
      {/* 補到表頭欄數，否則短少的那列會把後面的格子往前擠一欄 */}
      {Array.from({ length: width }, (_, i) => (
        <Cell key={i}>{values[i] ?? ''}</Cell>
      ))}
    </>
  );
}

function Cell({ children, head = false }: { children?: React.ReactNode; head?: boolean }) {
  return (
    <div
      className={`bg-[--color-tint-deep] p-3.5 text-center ${
        head ? 'font-semibold text-[--color-brand-deep]' : 'text-sm'
      }`}
    >
      {children}
    </div>
  );
}
