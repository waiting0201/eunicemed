import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '@/lib/api';
import { DataTable, ListPage, MissingCount } from '@/components/ListPage';
import { LocaleGauges } from '@/components/Gauge';
import { StatusTag } from '@/components/StatusTag';
import { describeLevel, levelOf } from '@/lib/completeness';

/**
 * 應用方案。**不分頁** —— 只有 7 筆，而且它們是網站的固定骨架（4 個部位 + 3 個特殊照護），
 * 不是會持續增加的內容。
 */
export function Applications() {
  const { data, isPending, error } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.applications(),
  });

  const missing = data?.filter((a) => !a.nameZhTw).length ?? 0;

  return (
    <ListPage
      eyebrow="內容"
      title="應用方案"
      actions={
        <Link to="/applications/new" className="btn btn-primary btn-sm">
          新增方案
        </Link>
      }
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.length}</span> 項 <MissingCount count={missing} unit="項" />
          </span>
        )
      }
    >
      <DataTable
        columns={6}
        isPending={isPending}
        error={error}
        isEmpty={data?.length === 0}
        emptyText="還沒有應用方案。"
        head={
          <tr>
            <th>名稱</th>
            <th className="w-28">型態</th>
            <th className="w-24">人體圖</th>
            <th className="w-24">產品數</th>
            <th className="w-36">內容完整度</th>
            <th className="w-24">狀態</th>
          </tr>
        }
      >
        {data?.map((a) => (
          <tr key={a.id}>
            <td className="max-w-0">
              <Link to={`/applications/${a.id}`} className="block truncate font-medium">
                {a.nameEn ?? a.nameZhTw ?? '（未命名）'}
              </Link>
              <span className="mono block truncate" style={{ color: 'var(--text-muted)' }}>
                {a.slug}
              </span>
            </td>
            <td>{a.type === 1 ? '依部位' : '特殊照護'}</td>
            <td>
              {/* 顯示於人體圖但沒有座標的方案發布時會被擋下（後端驗證），
                  這裡先讓它看得見 */}
              {a.showOnBodyMap ? (
                <span className="badge">顯示</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>—</span>
              )}
            </td>
            <td>
              <span className="mono">{a.productCount}</span>
            </td>
            <td>
              <LocaleGauges
                levels={{
                  en: levelOf([Boolean(a.nameEn), false, false]),
                  'zh-TW': levelOf([Boolean(a.nameZhTw), false, false]),
                }}
                labelOf={describeLevel}
                animateKey={a.id}
              />
            </td>
            <td>
              <StatusTag status={a.status} />
            </td>
          </tr>
        ))}
      </DataTable>
    </ListPage>
  );
}
