import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, ListPage } from '@/components/ListPage';
import { BAND_ONLY_PAGES, PAGE_LABELS } from '@/lib/pages';
import { formatDate } from '@/lib/format';

/**
 * 有可編輯區段的頁面。**不能新增或刪除** —— 頁面集合由 `Api/PageSchemas/` 的檔案
 * 決定，啟動時由同步器建立（docs/05 §5）。後台只改內容與啟用狀態。
 *
 * 另外 6 頁（Contact 與四支共用版型）的版面文案定案寫死在前端（docs/15 §2），
 * 一個欄位也沒有，`GET /admin/pages` 已把它們濾掉 —— 所以這裡不需要「沒有區段」的狀態。
 */
export function Pages() {
  const { data, isPending, error } = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.pages(),
    // 只有頁頂圖的頁在各自的清單畫面維護（docs/15 §15）
    select: (pages) => pages.filter((p) => !(p.key in BAND_ONLY_PAGES)),
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
        清單只列有版面文案可改的頁。站上其他頁不是還沒做：版面文字定案寫死（docs/15 §2），
        而 FAQ、下載這幾頁唯一能改的頁頂圖，放在側欄各自的項目最上方（docs/15 §15）。
        用側欄上的原字指路，才接得上編輯者要去的地方。
      */}
      <p className="form-hint mt-3">
        只列出有文字內容可以改的頁面。應用方案、FAQ、下載、銷售據點、文章的頁頂圖，在左側各自的項目最上方更換。
      </p>
    </ListPage>
  );
}
