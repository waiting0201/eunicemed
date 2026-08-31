import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type AdminRelatedItem } from '@/lib/api';
import { Icon } from '../Icon';

/**
 * 產品頁 §07「相關產品」的人工指定清單。
 *
 * <p>
 * **這一格的行為是全有全無的**，而且從畫面上看不出來，所以說明文字會跟著狀態換：
 * 空著時由 API 自動挑（同子分類 → 同分類 → 同部位，補到 4 張）；
 * 一旦加了任何一筆，產品頁就**只**顯示這裡的內容、不再自動補
 * （`ProductReadService.GetRelatedAsync`）。少填一筆的代價是版型缺一格，
 * 不是「補一個差不多的」。
 * </p>
 *
 * <p>
 * 排序用上下箭頭，與 <see cref="Repeater"/> 和圖庫一致 ——
 * 後台目前沒有任何拖拉互動，為這一個清單引進 dnd-kit 要付打包體積
 * （docs/03 §8.1），而這裡最多 8 筆。
 * </p>
 */
const MAX = 8;

/** 產品頁的相關產品是一列四張（`grid-template-columns:repeat(4,1fr)`）。 */
const PER_ROW = 4;

export function RelatedProducts({
  productId,
  items,
  onChange,
}: {
  productId: string;
  items: AdminRelatedItem[];
  onChange: (next: AdminRelatedItem[]) => void;
}) {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');

  // 打字時每一鍵都打 API 會讓 149 筆的搜尋端點空轉，等停下來再查
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(term.trim()), 250);
    return () => window.clearTimeout(t);
  }, [term]);

  const results = useQuery({
    queryKey: ['product-search', query],
    queryFn: () => api.products({ search: query, pageSize: '8' }),
    enabled: query.length > 0,
  });

  const chosen = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const full = items.length >= MAX;

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="form-label mb-0">相關產品</span>
        <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
          {items.length} / {MAX}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="form-hint mb-2">
          目前<strong>自動挑選</strong>：同子分類 → 同分類 → 同部位，補滿 4 張。
          在下面加入產品就改成手動指定。
        </p>
      ) : (
        <p className="form-hint mb-2">
          已改為<strong>手動指定</strong>：產品頁只顯示這 {items.length} 張，不會再自動補。
          版型是一列 {PER_ROW} 張
          {items.length % PER_ROW === 0 ? '，剛好排滿。' : `，最後一列會缺 ${PER_ROW - (items.length % PER_ROW)} 格。`}
        </p>
      )}

      {items.map((item, i) => (
        <div key={item.id} className="panel mb-2 flex items-center gap-3 p-2 pl-3">
          <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
            {String(i + 1).padStart(2, '0')}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9rem]">{item.nameEn ?? item.slug}</span>
            <span className="mono block truncate text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
              {item.sku ?? item.slug}
            </span>
          </span>

          <span className="flex gap-1">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              aria-label={`相關產品第 ${i + 1} 項上移`}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={i === items.length - 1}
              onClick={() => move(i, i + 1)}
              aria-label={`相關產品第 ${i + 1} 項下移`}
            >
              ↓
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ color: 'var(--red)' }}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`移除相關產品第 ${i + 1} 項`}
            >
              ✕
            </button>
          </span>
        </div>
      ))}

      <input
        type="search"
        className="form-control w-full"
        placeholder={full ? `已滿 ${MAX} 筆，先移除一筆再加` : '搜尋型號或名稱加入…'}
        value={term}
        disabled={full}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="搜尋要加入的相關產品"
      />

      {query.length > 0 && !full && (
        <div className="panel mt-1 p-1">
          {results.isPending && (
            <p className="px-2 py-1.5 text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
              搜尋中…
            </p>
          )}

          {results.data?.items.length === 0 && (
            <p className="px-2 py-1.5 text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
              沒有符合「{query}」的產品。
            </p>
          )}

          {results.data?.items.map((p) => {
            // 產品不能把自己列為相關產品（後端會回 400），所以連點都不給點
            const self = p.id === productId;
            const added = chosen.has(p.id);

            return (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left disabled:opacity-45"
                disabled={self || added}
                onClick={() => {
                  onChange([
                    ...items,
                    {
                      id: p.id,
                      slug: p.slug,
                      nameEn: p.nameEn ?? p.nameZhTw,
                      sku: p.sku,
                      sortOrder: items.length,
                    },
                  ]);
                  setTerm('');
                }}
              >
                {!self && !added && <Icon name="plus" className="icon icon-sm" />}
                <span className="min-w-0 flex-1 truncate text-[0.9rem]">
                  {p.nameEn ?? p.nameZhTw ?? p.slug}
                </span>
                <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
                  {self ? '這一件' : added ? '已加入' : (p.sku ?? '')}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
