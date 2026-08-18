import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, FilterGroup, ListPage, MissingCount } from '@/components/ListPage';
import { LocaleGauges } from '@/components/Gauge';
import { StatusTag } from '@/components/StatusTag';
import { describeLevel, levelOf } from '@/lib/completeness';

/** 台灣／國際兩分頁（docs/03 §5）—— 兩者的欄位重點不同，分開看比混在一起清楚。 */
const TYPES = [
  { value: '1', label: '台灣' },
  { value: '2', label: '國際' },
] as const;

export function Locations() {
  const [type, setType] = useState<string>('1');

  const { data, isPending, error } = useQuery({
    queryKey: ['sales-locations'],
    queryFn: () => api.salesLocations(),
  });

  const items = (data ?? []).filter((l) => String(l.locationType) === type);
  const missing = items.filter((l) => !l.translations['zh-TW']).length;
  const international = type === '2';

  return (
    <ListPage
      eyebrow="內容"
      title="銷售據點"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{items.length}</span> 處 <MissingCount count={missing} unit="處" />
          </span>
        )
      }
      filters={<FilterGroup value={type} options={[...TYPES]} onChange={setType} />}
    >
      <DataTable
        columns={5}
        isPending={isPending}
        error={error}
        isEmpty={items.length === 0}
        emptyText={international ? '還沒有國際經銷夥伴。' : '還沒有台灣通路。'}
        head={
          <tr>
            <th>名稱</th>
            <th className="w-28">{international ? '地區' : '電話'}</th>
            <th className="w-20">國別</th>
            <th className="w-36">內容完整度</th>
            <th className="w-24">狀態</th>
          </tr>
        }
      >
        {items.map((l) => {
          const en = l.translations.en;
          const zh = l.translations['zh-TW'];
          return (
            <tr key={l.id}>
              <td className="max-w-0">
                <span className="block truncate font-medium">
                  {en?.name ?? zh?.name ?? '（未命名）'}
                </span>
                <span className="block truncate text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>
                  {en?.address ?? zh?.address ?? ''}
                </span>
              </td>
              <td className="max-w-0">
                <span className="block truncate text-[0.82rem]">
                  {international
                    ? // 未填地區的會被 API 集中放在「其他地區」那一組 —— 標出來才知道要補
                      (en?.regionLabel?.trim() || zh?.regionLabel?.trim() || (
                        <span style={{ color: 'var(--red)' }}>未分組</span>
                      ))
                    : (l.phone ?? '—')}
                </span>
              </td>
              <td>
                <span className="mono">{l.countryCode}</span>
              </td>
              <td>
                <LocaleGauges
                  levels={{
                    en: levelOf([Boolean(en?.name), Boolean(en?.address), false]),
                    'zh-TW': levelOf([Boolean(zh?.name), Boolean(zh?.address), false]),
                  }}
                  labelOf={describeLevel}
                  animateKey={l.id}
                />
              </td>
              <td>
                <StatusTag status={l.status} />
              </td>
            </tr>
          );
        })}
      </DataTable>
    </ListPage>
  );
}
