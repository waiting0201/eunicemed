import type { ReactNode } from 'react';

/**
 * 列表畫面的共用骨架。
 *
 * <p>
 * docs/03 §8.1：「同類型畫面一旦定案就沿用同一個骨架，不逐頁重新設計」。
 * 這裡抽的是**外框**（標題列、篩選列、表格容器、載入／空／錯誤三態、分頁），
 * **不抽欄位** —— 各畫面的欄位差異很大，硬做成設定檔會比重複更難讀。
 * </p>
 */
export function ListPage({
  eyebrow,
  title,
  summary,
  actions,
  filters,
  children,
}: {
  eyebrow: string;
  title: string;
  /** 右上角的數量或缺漏提示 */
  summary?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {summary}
          {actions}
        </div>
      </header>

      {filters && <div className="mb-4 flex flex-wrap gap-2">{filters}</div>}

      {children}
    </>
  );
}

/** 篩選按鈕組。狀態、型態、分類都是同一種互動。 */
export function FilterGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`btn btn-sm ${value === option.value ? 'btn-primary' : 'btn-secondary'}`}
        >
          {option.label}
        </button>
      ))}
    </>
  );
}

/**
 * 表格容器，含載入／空／錯誤三態。
 *
 * <p>
 * 載入時用與實際列同高的骨架列而不是一個轉圈圖示 ——
 * 表格高度不會在資料進來時跳動，掃視中的人不會失去位置。
 * </p>
 */
export function DataTable({
  head,
  isPending,
  error,
  isEmpty,
  emptyText,
  columns,
  children,
}: {
  head: ReactNode;
  isPending: boolean;
  error?: unknown;
  isEmpty: boolean;
  emptyText: string;
  /** 骨架列要跨幾欄 */
  columns: number;
  children: ReactNode;
}) {
  return (
    <>
      {error != null && (
        <p role="alert" className="alert mb-4">
          {error instanceof Error ? error.message : '讀取失敗。'}
        </p>
      )}

      <div className="panel table-responsive">
        <table className="table table-hover">
          <thead>{head}</thead>
          <tbody>
            {isPending &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={columns}>
                    <span
                      className="block h-4 w-full animate-pulse rounded-sm"
                      style={{ background: 'var(--bg-elevated)' }}
                    />
                  </td>
                </tr>
              ))}

            {!isPending && children}

            {!isPending && isEmpty && (
              <tr>
                <td
                  colSpan={columns}
                  className="py-16 text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        上一頁
      </button>
      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        下一頁
      </button>
    </div>
  );
}

/** 缺漏提示。列表右上角那句「本頁 N 筆缺中文」。 */
export function MissingCount({ count, unit = '筆' }: { count: number; unit?: string }) {
  if (count === 0) return null;

  return (
    <span className="text-[0.85rem]" style={{ color: 'var(--red)' }}>
      本頁 <span className="mono">{count}</span> {unit}缺中文
    </span>
  );
}
