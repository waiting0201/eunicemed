import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable, FilterGroup, ListPage, MissingCount } from '@/components/ListPage';
import { LocaleGauges } from '@/components/Gauge';
import { StatusTag } from '@/components/StatusTag';
import { describeLevel, levelOf } from '@/lib/completeness';

/**
 * FAQ。**沒有 slug** —— 它是折疊面板的一列，不是一個頁面（docs/05 §3.7），
 * 所以列表用問題本身當識別，不顯示網址代稱。
 */
export function Faqs() {
  const [category, setCategory] = useState('');

  const { data, isPending, error } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => api.faqs(),
  });

  const categories = useQuery({
    queryKey: ['faq-categories'],
    queryFn: () => api.faqCategories(),
    staleTime: 5 * 60_000,
  });

  const items = category ? (data ?? []).filter((f) => f.categorySlug === category) : (data ?? []);
  const missing = items.filter((f) => !f.translations['zh-TW']).length;

  return (
    <ListPage
      eyebrow="內容"
      title="FAQ"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{items.length}</span> 則 <MissingCount count={missing} unit="則" />
          </span>
        )
      }
      filters={
        <FilterGroup
          value={category}
          options={[
            { value: '', label: '全部分類' },
            ...(categories.data ?? []).map((c) => ({
              value: c.slug,
              // 分類名稱後面帶題數 —— 空分類在前台會是一個點不出東西的 tab
              label: `${c.translations['zh-TW']?.name ?? c.slug}（${c.faqCount}）`,
            })),
          ]}
          onChange={setCategory}
        />
      }
    >
      <DataTable
        columns={4}
        isPending={isPending}
        error={error}
        isEmpty={items.length === 0}
        emptyText="這個分類還沒有問題。"
        head={
          <tr>
            <th>問題</th>
            <th className="w-32">分類</th>
            <th className="w-36">內容完整度</th>
            <th className="w-24">狀態</th>
          </tr>
        }
      >
        {items.map((f) => (
          <tr key={f.id}>
            <td className="max-w-0">
              <span className="block truncate font-medium">
                {f.translations.en?.question ?? f.translations['zh-TW']?.question ?? '（未填）'}
              </span>
            </td>
            <td>
              <span className="mono text-[0.78rem]">{f.categorySlug ?? '—'}</span>
            </td>
            <td>
              <LocaleGauges
                levels={{
                  en: levelOf([Boolean(f.translations.en?.question), Boolean(f.translations.en?.answer), false]),
                  'zh-TW': levelOf([
                    Boolean(f.translations['zh-TW']?.question),
                    Boolean(f.translations['zh-TW']?.answer),
                    false,
                  ]),
                }}
                labelOf={describeLevel}
                animateKey={f.id}
              />
            </td>
            <td>
              <StatusTag status={f.status} />
            </td>
          </tr>
        ))}
      </DataTable>
    </ListPage>
  );
}
