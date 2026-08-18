import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { ListPage } from '@/components/ListPage';
import { LOCALES } from '@/components/LocaleTabs';
import { Icon } from '@/components/Icon';

/**
 * 站台設定（Admin 專屬）。
 *
 * <p>
 * 鍵值兩種：**不需翻譯的**（email、電話、社群連結）與**需翻譯的**
 * （地址、營業時間文字）。公開端點讀取時翻譯值優先（docs/05 §3.11）。
 * 兩者的差別在畫面上要看得出來，否則編輯者會把地址填進不翻譯的那格，
 * 然後困惑為什麼英文站也顯示中文地址。
 * </p>
 */
const KNOWN: Record<string, { label: string; translated: boolean; hint?: string }> = {
  'company.email': { label: '聯絡信箱', translated: false },
  'company.phone': { label: '聯絡電話', translated: false },
  'company.address': { label: '公司地址', translated: true, hint: '頁尾與 Contact 頁共用同一份。' },
  'company.hours': { label: '營業時間', translated: true },
  'social.linkedin': { label: 'LinkedIn', translated: false },
  'seo.defaultTitle': { label: 'SEO 預設標題', translated: true },
  'seo.defaultDescription': { label: 'SEO 預設敘述', translated: true },
};

export function Settings() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, { value?: string; translations: Record<string, string> }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newKey, setNewKey] = useState('');

  const { data, isPending } = useQuery({ queryKey: ['settings'], queryFn: () => api.adminSettings() });

  useEffect(() => {
    if (!data) return;
    setDraft(
      Object.fromEntries(
        data.map((s) => [
          s.key,
          {
            value: typeof s.value === 'string' ? s.value : undefined,
            translations: Object.fromEntries(
              Object.entries(s.translations).map(([l, v]) => [l, typeof v === 'string' ? v : '']),
            ),
          },
        ]),
      ),
    );
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.saveSettings(
        Object.fromEntries(
          Object.entries(draft).map(([key, entry]) => [
            key,
            {
              // 只送有值的部分。value 與 translations 是兩個獨立的儲存位置，
              // 送 undefined 表示不動它（後端的慣例）
              value: entry.value !== undefined ? entry.value : undefined,
              translations:
                Object.keys(entry.translations).length > 0 ? entry.translations : undefined,
            },
          ]),
        ),
      ),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  if (isPending) return <p style={{ color: 'var(--text-muted)' }}>載入中…</p>;

  const keys = Object.keys(draft).sort();

  return (
    <ListPage
      eyebrow="系統"
      title="設定"
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
            {save.isPending ? '儲存中…' : '儲存全部'}
          </button>
        </>
      }
    >
      {error && (
        <p role="alert" className="alert mb-4">
          {error}
        </p>
      )}

      <div className="panel mb-5">
        <div className="panel-body">
          {keys.map((key) => {
            const meta = KNOWN[key];
            const entry = draft[key];
            // 未知的鍵：判斷依據是它目前哪一邊有值。新增的鍵預設不翻譯。
            const translated = meta?.translated ?? Object.keys(entry.translations).length > 0;

            return (
              <div key={key} className="mb-5 border-b pb-4 last:mb-0 last:border-0 last:pb-0"
                   style={{ borderColor: 'var(--border)' }}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="form-label mb-0">{meta?.label ?? key}</span>
                  <span className="mono text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>
                    {key}
                  </span>
                </div>

                {translated ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {LOCALES.map((locale) => (
                      <label key={locale} className="block">
                        <span className="form-hint">{locale}</span>
                        <input
                          className="form-control"
                          value={entry.translations[locale] ?? ''}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              [key]: {
                                ...d[key],
                                translations: { ...d[key].translations, [locale]: e.target.value },
                              },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="form-control mono"
                    value={entry.value ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: { ...d[key], value: e.target.value } }))
                    }
                  />
                )}

                {meta?.hint && <p className="form-hint">{meta.hint}</p>}
                {!translated && (
                  <p className="form-hint">所有語系共用同一個值。</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="text-[0.95rem] font-semibold">新增設定鍵</h2>
        </div>
        <div className="panel-body flex flex-wrap gap-2">
          <input
            className="form-control mono w-72"
            placeholder="例如 social.facebook"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!newKey.trim() || newKey in draft}
            onClick={() => {
              setDraft((d) => ({ ...d, [newKey.trim()]: { value: '', translations: {} } }));
              setNewKey('');
            }}
          >
            新增
          </button>
          <p className="form-hint w-full">
            新增的鍵預設為所有語系共用。需要逐語系的值請先告知開發者 ——
            前台要讀得到它才有意義。
          </p>
        </div>
      </div>
    </ListPage>
  );
}
