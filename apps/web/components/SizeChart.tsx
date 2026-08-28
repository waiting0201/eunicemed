import { css } from '@/lib/css';
import type { ProductDetail } from '@/lib/api';

/**
 * 尺寸表。形狀是 `{measureLabel,sizes:[],rows:[{label?,values:[]}],footnote?}`，
 * 由後台的產品表單自由填寫 —— 所以**每一層都要能吃到缺漏**：
 * 少了 sizes 就整塊不渲染，某列 values 比表頭短就補空格。
 * 版型是格線，欄數對不上會整個垮掉。
 */
/** 樣式逐字取自 `mockup4/Product Detail.dc.html` §4 的尺寸表。 */
const S = {
  grid: css`display:grid;gap:1px;background:#EDF4F6;border:1px solid #DFE9EC;border-radius:14px;overflow:hidden;`,
  head: css`background:#F0F6F8;padding:14px;text-align:center;color:#0092A8;font-weight:620;`,
  cell: css`background:#F0F6F8;padding:14px;text-align:center;color:#4B5B61;font-size:.9rem;`,
  footnote: css`color:#66787F;font-size:.82rem;margin-top:12px;`,
} as const;

export function SizeChart({ chart }: { chart: NonNullable<ProductDetail['sizeChart']> }) {
  const sizes = chart.sizes ?? [];
  if (sizes.length === 0) return null;

  const rows = chart.rows ?? [];
  // 有任何一列帶 label 就多開一欄放列名（例如「小腿圍」「大腿圍」兩列）
  const hasRowLabels = rows.some((r) => r.label);
  const columns = sizes.length + (hasRowLabels ? 1 : 0);

  return (
    <div>
      <div style={{ ...S.grid, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
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

      {chart.footnote && <p style={S.footnote}>{chart.footnote}</p>}
    </div>
  );
}

function Row({ label, values, width }: { label: string | null; values: string[]; width: number }) {
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
  return <div style={head ? S.head : S.cell}>{children}</div>;
}
