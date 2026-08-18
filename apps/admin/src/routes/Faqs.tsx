import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminFaq } from '@/lib/api';
import { DataTable, FilterGroup, ListPage, MissingCount } from '@/components/ListPage';
import { Dialog, DialogActions } from '@/components/Dialog';
import { Field, FieldRow } from '@/components/form/Field';
import { RichText } from '@/components/form/RichText';
import { LocaleGauges } from '@/components/Gauge';
import { StatusSelect } from '@/components/StatusSelect';
import { StatusTag } from '@/components/StatusTag';
import { TranslationTabs } from '@/components/TranslationTabs';
import { describeLevel, levelOf } from '@/lib/completeness';
import type { Locale } from '@/components/LocaleTabs';

type FaqDraft = {
  faqCategoryId: string;
  status: number;
  sortOrder: number;
  translations: Record<string, { question: string; answer: string } | null>;
};

/**
 * FAQ。**沒有 slug** —— 它是折疊面板的一列，不是一個頁面（docs/05 §3.7），
 * 所以列表用問題本身當識別，不顯示網址代稱。
 */
export function Faqs() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<AdminFaq | 'new' | null>(null);

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
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          新增問題
        </button>
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
        columns={5}
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
            <th className="w-20" />
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
            <td>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(f)}>
                編輯
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {editing && (
        <FaqDialog
          faq={editing === 'new' ? null : editing}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['faqs'] });
            queryClient.invalidateQueries({ queryKey: ['faq-categories'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            setEditing(null);
          }}
        />
      )}
    </ListPage>
  );
}

function FaqDialog({
  faq,
  categories,
  onClose,
  onSaved,
}: {
  faq: AdminFaq | null;
  categories: { id: string; slug: string; translations: Record<string, { name: string }> }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<FaqDraft>({
    faqCategoryId: faq?.faqCategoryId ?? categories[0]?.id ?? '',
    status: faq?.status ?? 1,
    sortOrder: faq?.sortOrder ?? 0,
    translations: faq ? { ...faq.translations } : { en: { question: '', answer: '' } },
  });
  const [error, setError] = useState<string | null>(null);

  const save = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const body = { ...draft };
      if (faq) await api.saveFaq(faq.id, body);
      else await api.createFaq(body);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  const remove = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      if (faq) await api.deleteFaq(faq.id);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '刪除失敗。'),
  });

  const patch = (locale: Locale, p: Partial<{ question: string; answer: string }>) =>
    setDraft((d) => ({
      ...d,
      translations: {
        ...d.translations,
        [locale]: { question: '', answer: '', ...(d.translations[locale] ?? {}), ...p },
      },
    }));

  return (
    <Dialog
      title={faq ? '編輯問題' : '新增問題'}
      onClose={onClose}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          onSave={() => save.mutate()}
          danger={
            faq && (
              <button
                type="button"
                className="btn btn-sm btn-danger mr-auto"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm('刪除後無法復原。確定要刪除這則問題嗎？')) remove.mutate();
                }}
              >
                刪除
              </button>
            )
          }
        />
      }
    >
      <FieldRow>
        <Field label="分類" required>
          <select
            className="form-control"
            value={draft.faqCategoryId}
            onChange={(e) => setDraft({ ...draft, faqCategoryId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.translations['zh-TW']?.name ?? c.translations.en?.name ?? c.slug}
              </option>
            ))}
          </select>
        </Field>
        <Field label="排序" hint="同分類內由小到大。">
          <input
            type="number"
            className="form-control mono"
            value={draft.sortOrder}
            onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
          />
        </Field>
      </FieldRow>

      <Field label="狀態">
        <StatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} />
      </Field>

      <TranslationTabs
        translations={draft.translations}
        hasContent={(v) => Boolean(v?.question?.trim())}
        onRemove={(locale) =>
          setDraft((d) => ({ ...d, translations: { ...d.translations, [locale]: null } }))
        }
      >
        {(locale) => {
          const tr = draft.translations[locale] ?? { question: '', answer: '' };
          return (
            <>
              <Field label="問題" required>
                <input
                  className="form-control"
                  value={tr.question}
                  onChange={(e) => patch(locale, { question: e.target.value })}
                />
              </Field>
              <Field label="答案" required hint="折疊面板裡的一段短文。">
                <RichText
                  value={tr.answer}
                  onChange={(answer) => patch(locale, { answer })}
                />
              </Field>
            </>
          );
        }}
      </TranslationTabs>
    </Dialog>
  );
}
