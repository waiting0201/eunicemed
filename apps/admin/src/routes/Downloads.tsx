import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, FilterGroup, ListPage, MissingCount } from '@/components/ListPage';
import { LocaleGauges } from '@/components/Gauge';
import { StatusTag } from '@/components/StatusTag';
import { describeLevel, levelOf } from '@/lib/completeness';

const TYPES = [
  { value: '', label: '全部' },
  { value: 'catalog', label: '型錄' },
  { value: 'manual', label: '使用說明' },
  { value: 'certificate', label: '認證文件' },
] as const;

const TYPE_LABEL: Record<number, string> = { 1: '型錄', 2: '使用說明', 3: '認證文件' };

export function Downloads() {
  const [type, setType] = useState<string>('');

  const { data, isPending, error } = useQuery({
    queryKey: ['downloads'],
    queryFn: () => api.downloads(),
  });

  const wanted = { catalog: 1, manual: 2, certificate: 3 }[type as 'catalog' | 'manual' | 'certificate'];
  const items = wanted ? (data ?? []).filter((d) => d.type === wanted) : (data ?? []);
  const missing = items.filter((d) => !d.translations['zh-TW']).length;

  return (
    <ListPage
      eyebrow="內容"
      title="下載"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{items.length}</span> 份 <MissingCount count={missing} unit="份" />
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
        emptyText="這個分類還沒有文件。"
        head={
          <tr>
            <th>標題</th>
            <th className="w-28">類型</th>
            <th className="w-32">檔案</th>
            <th className="w-36">內容完整度</th>
            <th className="w-24">狀態</th>
          </tr>
        }
      >
        {items.map((d) => (
          <tr key={d.id}>
            <td className="max-w-0">
              <span className="block truncate font-medium">
                {d.translations.en?.title ?? d.translations['zh-TW']?.title ?? '（未命名）'}
              </span>
              <span className="mono block truncate text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
                掛在 {d.productIds.length} 筆產品上
              </span>
            </td>
            <td>{TYPE_LABEL[d.type] ?? '—'}</td>
            <td>
              {/*
                fileLocale 是**檔案本身的語言**，與介面語系無關（docs/05 §3.8）——
                中文站也可能列出 EN 的型錄，那不是漏翻。
              */}
              <span className="mono text-[0.78rem]">{d.fileLocale}</span>
            </td>
            <td>
              <LocaleGauges
                levels={{
                  en: levelOf([
                    Boolean(d.translations.en?.title),
                    Boolean(d.translations.en?.description),
                    false,
                  ]),
                  'zh-TW': levelOf([
                    Boolean(d.translations['zh-TW']?.title),
                    Boolean(d.translations['zh-TW']?.description),
                    false,
                  ]),
                }}
                labelOf={describeLevel}
                animateKey={d.id}
              />
            </td>
            <td>
              <StatusTag status={d.status} />
            </td>
          </tr>
        ))}
      </DataTable>
    </ListPage>
  );
}
