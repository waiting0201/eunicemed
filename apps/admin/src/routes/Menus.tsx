import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminMenuItem } from '@/lib/api';
import { ListPage } from '@/components/ListPage';
import { LOCALES } from '@/components/LocaleTabs';
import { Icon } from '@/components/Icon';

/**
 * 導覽選單。
 *
 * <p>
 * **整棵樹一次取代**（後端只有 `PUT /admin/menus`）。逐項 CRUD 在樹狀結構上很難用：
 * 搬移一個節點是「改 parent + 改兩邊排序」，拆成多次請求會在中途留下順序錯亂的狀態。
 * </p>
 *
 * <p>
 * ⚠️ **Resources 次導覽（總覽｜FAQ｜專欄｜下載｜消息）不在這裡** ——
 * 它固定於前端模板。版面已鎖定，開放編輯的話一次改壞會讓五個頁面同時失去導覽
 * （docs/05 §3.9）。
 * </p>
 */
type Node = { url: string; labels: Record<string, string>; children: Node[] };

const MENUS = [
  { key: 'header', label: '頁首' },
  { key: 'footer', label: '頁尾' },
];

export function Menus() {
  const queryClient = useQueryClient();
  const [menu, setMenu] = useState('header');
  const [tree, setTree] = useState<Node[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isPending } = useQuery({ queryKey: ['menus'], queryFn: () => api.adminMenus() });

  useEffect(() => {
    if (data) setTree(toTree(data, menu));
  }, [data, menu]);

  const save = useMutation({
    mutationFn: () => api.saveMenu(menu, tree),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  if (isPending) return <p style={{ color: 'var(--text-muted)' }}>載入中…</p>;

  return (
    <ListPage
      eyebrow="系統"
      title="導覽選單"
      actions={
        <>
          {saved && (
            <span className="badge" style={{ color: 'var(--green)' }}>
              <Icon name="check" className="icon icon-sm" />
              已儲存
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? '儲存中…' : `儲存${MENUS.find((m) => m.key === menu)?.label}選單`}
          </button>
        </>
      }
      filters={MENUS.map((m) => (
        <button
          key={m.key}
          type="button"
          aria-pressed={menu === m.key}
          onClick={() => setMenu(m.key)}
          className={`btn btn-sm ${menu === m.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {m.label}
        </button>
      ))}
    >
      {error && (
        <p role="alert" className="alert mb-4">
          {error}
        </p>
      )}

      <p className="form-hint mb-3">
        資源中心的次導覽（總覽｜FAQ｜專欄｜下載｜消息）固定於模板，不在這裡維護。
        最多兩層 —— 更深的層級版型渲染不出來。
      </p>

      <div className="panel">
        <div className="panel-body">
          <NodeList nodes={tree} onChange={setTree} depth={1} />
        </div>
      </div>
    </ListPage>
  );
}

function NodeList({
  nodes,
  onChange,
  depth,
}: {
  nodes: Node[];
  onChange: (next: Node[]) => void;
  depth: number;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= nodes.length) return;
    const next = nodes.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const update = (i: number, patch: Partial<Node>) =>
    onChange(nodes.map((n, j) => (j === i ? { ...n, ...patch } : n)));

  return (
    <>
      {nodes.map((node, i) => (
        <div key={i} className="panel mb-2 p-3">
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <label className="block flex-1 min-w-48">
              <span className="form-hint">網址（相對路徑，語系前綴由模板補上）</span>
              <input
                className="form-control mono"
                placeholder="/products"
                value={node.url}
                onChange={(e) => update(i, { url: e.target.value })}
              />
            </label>

            {LOCALES.map((locale) => (
              <label key={locale} className="block flex-1 min-w-40">
                <span className="form-hint">{locale} 標籤</span>
                <input
                  className="form-control"
                  value={node.labels[locale] ?? ''}
                  onChange={(e) =>
                    update(i, { labels: { ...node.labels, [locale]: e.target.value } })
                  }
                />
              </label>
            ))}

            <span className="flex">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                aria-label="上移"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={i === nodes.length - 1}
                onClick={() => move(i, i + 1)}
                aria-label="下移"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                onClick={() => onChange(nodes.filter((_, j) => j !== i))}
                aria-label="刪除"
              >
                ✕
              </button>
            </span>
          </div>

          {/* 缺任一語系標籤的項目在該語系會整個不出現（後端 INNER JOIN 翻譯表）——
              導覽尤其不能混語系，那是每一頁都看得到的東西 */}
          {LOCALES.some((l) => !node.labels[l]?.trim()) && (
            <p className="form-hint" style={{ color: 'var(--red)' }}>
              缺標籤的語系不會顯示這個項目。
            </p>
          )}

          {depth < 2 && (
            <div className="ml-6 mt-2 border-l pl-3" style={{ borderColor: 'var(--border)' }}>
              <NodeList
                nodes={node.children}
                onChange={(children) => update(i, { children })}
                depth={depth + 1}
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => update(i, { children: [...node.children, emptyNode()] })}
              >
                <Icon name="plus" className="icon icon-sm" />
                新增子項目
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => onChange([...nodes, emptyNode()])}
      >
        <Icon name="plus" className="icon icon-sm" />
        新增項目
      </button>
    </>
  );
}

function emptyNode(): Node {
  return { url: '', labels: {}, children: [] };
}

/** 後端回扁平清單，這裡組成樹（最多兩層）。 */
function toTree(items: AdminMenuItem[], menu: string): Node[] {
  const scoped = items.filter((i) => i.menu === menu).sort((a, b) => a.sortOrder - b.sortOrder);

  const build = (parentId: string | null): Node[] =>
    scoped
      .filter((i) => i.parentId === parentId)
      .map((i) => ({ url: i.url, labels: { ...i.labels }, children: build(i.id) }));

  return build(null);
}
