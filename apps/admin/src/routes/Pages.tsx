import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, ListPage } from '@/components/ListPage';
import { PAGE_LABELS } from '@/lib/pages';
import { formatDate } from '@/lib/format';

/**
 * 18 個頁面。**不能新增或刪除** —— 頁面集合由 `Api/PageSchemas/` 的檔案決定，
 * 啟動時由同步器建立（docs/05 §5）。後台只改內容與啟用狀態。
 */
export function Pages() {
  const { data, isPending, error } = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.pages(),
  });

  return (
    <ListPage
      eyebrow="內容"
      title="頁面內容"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.length}</span> 頁
          </span>
        )
      }
    >
      <DataTable
        columns={4}
        isPending={isPending}
        error={error}
        isEmpty={data?.length === 0}
        emptyText="還沒有頁面。這通常表示區段同步器沒有跑起來。"
        head={
          <tr>
            <th>頁面</th>
            <th className="w-40">網址</th>
            <th className="w-24">區段數</th>
            <th className="w-28">最後更新</th>
          </tr>
        }
      >
        {data?.map((page) => {
          const meta = PAGE_LABELS[page.key];
          return (
            <tr key={page.key}>
              <td className="max-w-0">
                <Link to={`/pages/${page.key}`} className="block truncate font-medium">
                  {meta?.label ?? page.key}
                </Link>
                <span className="mono block truncate" style={{ color: 'var(--text-muted)' }}>
                  {page.key}
                </span>
              </td>
              <td className="max-w-0">
                {meta?.path ? (
                  <span className="mono block truncate text-[0.78rem]">{meta.path}</span>
                ) : (
                  // 共用文案的頁沒有自己的網址 —— 說明它套用在哪裡，
                  // 否則編輯者會找不到自己改的東西出現在哪一頁
                  <span className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>
                    {meta?.note ?? '—'}
                  </span>
                )}
              </td>
              <td>
                {page.sectionCount > 0 ? (
                  <span className="mono">{page.sectionCount}</span>
                ) : (
                  // schema 還沒寫的頁 —— 前台用寫死的文案渲染，不是壞掉，
                  // 但編輯者在這裡什麼也改不了，要講清楚
                  <span className="badge" title="這一頁的 schema 檔尚未撰寫">
                    尚未開放編輯
                  </span>
                )}
              </td>
              <td>
                <span className="mono text-[0.78rem]">{formatDate(page.updatedAt)}</span>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </ListPage>
  );
}
