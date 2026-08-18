import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '@/lib/api';
import { DataTable, FilterGroup, ListPage, MissingCount, Pager } from '@/components/ListPage';
import { LocaleGauges } from '@/components/Gauge';
import { StatusTag } from '@/components/StatusTag';
import { describeLevel, levelOf } from '@/lib/completeness';
import { formatDate, isScheduled } from '@/lib/format';

/** News 與 Insights 在後端是同一個實體，以 type 分流 —— 後台也用同一個畫面。 */
const TYPES = [
  { value: '', label: '全部' },
  { value: 'news', label: '最新消息' },
  { value: 'insight', label: '專欄文章' },
] as const;

const STATUSES = [
  { value: '', label: '全部狀態' },
  { value: 'published', label: '已發布' },
  { value: 'draft', label: '草稿' },
] as const;

export function Articles() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isPending, error } = useQuery({
    queryKey: ['articles', page, type, status, search],
    queryFn: () =>
      api.articles({
        page: String(page),
        pageSize: '20',
        type: type || undefined,
        status: status || undefined,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const missing = data?.items.filter((a) => !a.titleZhTw).length ?? 0;

  return (
    <ListPage
      eyebrow="內容"
      title="文章"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.totalCount}</span> 篇 <MissingCount count={missing} unit="篇" />
          </span>
        )
      }
      actions={
        <Link to="/articles/new" className="btn btn-primary btn-sm">
          新增文章
        </Link>
      }
      filters={
        <>
          <input
            type="search"
            className="form-control w-56"
            placeholder="搜尋標題"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <FilterGroup
            value={type}
            options={[...TYPES]}
            onChange={(v) => {
              setType(v);
              setPage(1);
            }}
          />
          <FilterGroup
            value={status}
            options={[...STATUSES]}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </>
      }
    >
      <DataTable
        columns={6}
        isPending={isPending}
        error={error}
        isEmpty={data?.items.length === 0}
        emptyText="沒有符合條件的文章。調整搜尋或篩選再試一次。"
        head={
          <tr>
            <th>標題</th>
            <th className="w-24">型態</th>
            <th className="w-28">分類</th>
            <th className="w-36">內容完整度</th>
            <th className="w-28">發布時間</th>
            <th className="w-24">狀態</th>
          </tr>
        }
      >
        {data?.items.map((a) => (
          <tr key={a.id}>
            <td className="max-w-0">
              <Link to={`/articles/${a.id}`} className="block truncate font-medium">
                {a.titleEn ?? a.titleZhTw ?? '（未命名）'}
              </Link>
              <span className="mono block truncate" style={{ color: 'var(--text-muted)' }}>
                {a.slug}
              </span>
            </td>
            <td>{a.type === 1 ? '最新消息' : '專欄文章'}</td>
            <td className="max-w-0">
              <span className="mono block truncate text-[0.78rem]">{a.categorySlug ?? '—'}</span>
            </td>
            <td>
              <LocaleGauges
                levels={{
                  en: levelOf([Boolean(a.titleEn), false, false]),
                  'zh-TW': levelOf([Boolean(a.titleZhTw), false, false]),
                }}
                labelOf={describeLevel}
                animateKey={a.id}
              />
            </td>
            <td>
              <span className="mono text-[0.78rem]">{formatDate(a.publishedAt)}</span>
            </td>
            <td>
              <StatusTag status={a.status} scheduled={isScheduled(a.status, a.publishedAt)} />
            </td>
          </tr>
        ))}
      </DataTable>

      {data && <Pager page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </ListPage>
  );
}
