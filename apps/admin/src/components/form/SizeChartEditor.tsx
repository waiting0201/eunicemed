import { Icon } from '../Icon';

export type SizeChart = {
  measureLabel?: string;
  sizes?: string[];
  rows?: { label?: string | null; values?: string[] }[];
  footnote?: string | null;
};

/**
 * 尺寸表編輯器。
 *
 * <p>
 * 形狀是「表頭（尺碼）＋ 每列一組量測值」。**欄數由表頭決定** ——
 * 新增／刪除一個尺碼時，每一列都要跟著補齊或截斷，否則前台的格線會錯位
 * （版型是 CSS grid，短少的列會把後面的格子往前擠一欄）。
 * 這個對齊在這裡就做掉，不要留給前端猜。
 * </p>
 */
export function SizeChartEditor({
  value,
  onChange,
}: {
  value: SizeChart | null | undefined;
  onChange: (next: SizeChart | null) => void;
}) {
  const chart = value ?? {};
  const sizes = chart.sizes ?? [];
  const rows = chart.rows ?? [];

  /** 表頭變動時把每一列補齊／截斷到同樣長度 */
  const withSizes = (nextSizes: string[]): SizeChart => ({
    ...chart,
    sizes: nextSizes,
    rows: rows.map((r) => ({
      ...r,
      values: Array.from({ length: nextSizes.length }, (_, i) => r.values?.[i] ?? ''),
    })),
  });

  if (sizes.length === 0 && rows.length === 0) {
    return (
      <div className="mb-5">
        <span className="form-label">尺寸表</span>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() =>
            onChange({ sizes: ['S', 'M', 'L'], rows: [{ label: '', values: ['', '', ''] }] })
          }
        >
          <Icon name="plus" className="icon icon-sm" />
          建立尺寸表
        </button>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="form-label mb-0">尺寸表</span>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          style={{ color: 'var(--red)' }}
          onClick={() => onChange(null)}
        >
          移除尺寸表
        </button>
      </div>

      <input
        className="form-control mb-3"
        placeholder="量測部位（顯示於標題括號內，如 大腿圍）"
        value={chart.measureLabel ?? ''}
        onChange={(e) => onChange({ ...chart, measureLabel: e.target.value })}
      />
      {/* 量測部位圖不分語系，所以不在這個語系分頁裡 —— 沒有這行指路，
          填完表的人會在這裡找一個不存在的上傳欄位 */}
      <p className="form-hint mb-3">
        表格旁邊的量測部位圖在「圖片與關聯」設定，各語系共用。
      </p>

      <div className="table-responsive panel mb-2">
        <table className="table">
          <thead>
            <tr>
              <th className="w-32">列名</th>
              {sizes.map((size, i) => (
                <th key={i} className="w-24">
                  <input
                    className="form-control mono"
                    value={size}
                    aria-label={`第 ${i + 1} 個尺碼`}
                    onChange={(e) =>
                      onChange(withSizes(sizes.map((s, j) => (j === i ? e.target.value : s))))
                    }
                  />
                </th>
              ))}
              <th className="w-10">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  aria-label="新增尺碼欄"
                  onClick={() => onChange(withSizes([...sizes, '']))}
                >
                  ＋
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td>
                  <input
                    className="form-control"
                    placeholder="（可留空）"
                    value={row.label ?? ''}
                    aria-label={`第 ${ri + 1} 列的名稱`}
                    onChange={(e) =>
                      onChange({
                        ...chart,
                        rows: rows.map((r, j) =>
                          j === ri ? { ...r, label: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </td>
                {sizes.map((_, ci) => (
                  <td key={ci}>
                    <input
                      className="form-control mono"
                      value={row.values?.[ci] ?? ''}
                      aria-label={`第 ${ri + 1} 列、${sizes[ci] || ci + 1} 的值`}
                      onChange={(e) =>
                        onChange({
                          ...chart,
                          rows: rows.map((r, j) =>
                            j === ri
                              ? {
                                  ...r,
                                  values: Array.from(
                                    { length: sizes.length },
                                    (_, k) => (k === ci ? e.target.value : (r.values?.[k] ?? '')),
                                  ),
                                }
                              : r,
                          ),
                        })
                      }
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ color: 'var(--red)' }}
                    aria-label={`刪除第 ${ri + 1} 列`}
                    onClick={() => onChange({ ...chart, rows: rows.filter((_, j) => j !== ri) })}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() =>
            onChange({
              ...chart,
              rows: [...rows, { label: '', values: sizes.map(() => '') }],
            })
          }
        >
          <Icon name="plus" className="icon icon-sm" />
          新增一列
        </button>
        {sizes.length > 1 && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onChange(withSizes(sizes.slice(0, -1)))}
          >
            刪除最後一個尺碼欄
          </button>
        )}
      </div>

      <input
        className="form-control mt-3"
        placeholder="附註（如 單位為公分）"
        value={chart.footnote ?? ''}
        onChange={(e) => onChange({ ...chart, footnote: e.target.value })}
      />
    </div>
  );
}
