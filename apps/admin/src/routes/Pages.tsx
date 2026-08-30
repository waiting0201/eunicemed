import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, ListPage } from '@/components/ListPage';
import { PAGE_LABELS } from '@/lib/pages';
import { formatDate } from '@/lib/format';

/**
 * 有可編輯區段的頁面。**不能新增或刪除** —— 頁面集合由 `Api/PageSchemas/` 的檔案
 * 決定，啟動時由同步器建立（docs/05 §5）。後台只改內容與啟用狀態。
 *
 * 另外 12 頁的版面文案定案寫死在前端（docs/15 §2），一個欄位也沒有，
 * `GET /admin/pages` 已把它們濾掉 —— 所以這裡不需要「沒有區段」的狀態。
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
                <span className="mono">{page.sectionCount}</span>
              </td>
              <td>
                <span className="mono text-[0.78rem]">{formatDate(page.updatedAt)}</span>
              </td>
            </tr>
          );
        })}
      </DataTable>

      {/*
        清單只有 6 列，而站上有 18 頁 —— 少了的那些不是還沒做，是定案不進後台
        （docs/15 §2）。不解釋的話，編輯者會在這裡找「最新消息」找到懷疑人生。
        用側欄上的原字（FAQ、下載、銷售據點…）指路，才接得上他們要去的地方。
      */}
      <p className="form-hint mt-3">
        只列出有內容可以改的頁面。FAQ、下載、銷售據點、應用方案、文章這些頁面的版面文字與頁頂圖固定不變，實際內容在左側各自的項目裡維護。
      </p>
    </ListPage>
  );
}
