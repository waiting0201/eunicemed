import type { ReactNode } from 'react';
import { Icon } from '../Icon';

/**
 * 可重複區塊（特色、使用情境、規格…）。
 *
 * <p>
 * 上下限來自後端的 JSON Schema／欄位規格（例如特色 2–6 筆）——
 * 超出範圍時**把新增鈕停用並說明原因**，而不是等存檔才被 400 退回來。
 * </p>
 *
 * <p>
 * 排序目前用上下箭頭而非拖拉：dnd-kit 要 code-split（docs/03 §8.1），
 * 而這些清單最多 6 筆，箭頭夠用也對鍵盤友善。圖庫那種幾十筆的才值得拖拉。
 * </p>
 */
export function Repeater<T>({
  label,
  items,
  onChange,
  create,
  min = 0,
  max = 20,
  renderItem,
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  create: () => T;
  min?: number;
  max?: number;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="form-label mb-0">{label}</span>
        <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
          {items.length} / {max}
        </span>
      </div>

      {items.map((item, i) => (
        <div key={i} className="panel mb-2 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                aria-label={`${label} 第 ${i + 1} 項上移`}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={i === items.length - 1}
                onClick={() => move(i, i + 1)}
                aria-label={`${label} 第 ${i + 1} 項下移`}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={items.length <= min}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={`刪除 ${label} 第 ${i + 1} 項`}
                style={{ color: 'var(--red)' }}
              >
                ✕
              </button>
            </span>
          </div>

          {renderItem(
            item,
            (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))),
            i,
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-sm btn-secondary"
        disabled={items.length >= max}
        onClick={() => onChange([...items, create()])}
      >
        <Icon name="plus" className="icon icon-sm" />
        新增{label}
      </button>

      {items.length >= max && (
        <p className="form-hint">已達上限 {max} 筆。要新增請先刪掉一筆。</p>
      )}
      {items.length < min && (
        <p className="form-hint" style={{ color: 'var(--red)' }}>
          至少需要 {min} 筆才能發布。
        </p>
      )}
    </div>
  );
}
