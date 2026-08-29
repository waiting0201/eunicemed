import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminDownload } from '@/lib/api';
import { DataTable, FilterGroup, ListPage, MissingCount } from '@/components/ListPage';
import { Dialog, DialogActions } from '@/components/Dialog';
import { Field, FieldRow } from '@/components/form/Field';
import { FileField } from '@/components/MediaField';
import { LocaleGauges } from '@/components/Gauge';
import { StatusSelect } from '@/components/StatusSelect';
import { StatusTag } from '@/components/StatusTag';
import { TranslationTabs } from '@/components/TranslationTabs';
import { describeLevel, levelOf } from '@/lib/completeness';
import type { Locale } from '@/components/LocaleTabs';

const TYPES = [
  { value: '', label: '全部' },
  { value: 'catalog', label: '型錄' },
  { value: 'manual', label: '使用說明' },
  { value: 'certificate', label: '認證文件' },
] as const;

const TYPE_LABEL: Record<number, string> = { 1: '型錄', 2: '使用說明', 3: '認證文件' };

export function Downloads() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>('');
  const [editing, setEditing] = useState<AdminDownload | 'new' | null>(null);

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
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          新增文件
        </button>
      }
      filters={<FilterGroup value={type} options={[...TYPES]} onChange={setType} />}
    >
      <DataTable
        columns={6}
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
            <th className="w-20" />
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
            <td>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(d)}>
                編輯
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {editing && (
        <DownloadDialog
          download={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['downloads'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            setEditing(null);
          }}
        />
      )}
    </ListPage>
  );
}

type DownloadDraft = {
  mediaId: string | null;
  type: number;
  fileLocale: string;
  status: number;
  sortOrder: number;
  translations: Record<string, { title: string; description?: string | null } | null>;
};

function DownloadDialog({
  download,
  onClose,
  onSaved,
}: {
  download: AdminDownload | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<DownloadDraft>({
    mediaId: download?.mediaId ?? null,
    type: download?.type ?? 1,
    fileLocale: download?.fileLocale ?? 'en',
    status: download?.status ?? 1,
    sortOrder: download?.sortOrder ?? 0,
    translations: download ? { ...download.translations } : { en: { title: '' } },
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      if (download) await api.saveDownload(download.id, draft);
      else await api.createDownload(draft);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  const remove = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      if (download) await api.deleteDownload(download.id);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '刪除失敗。'),
  });

  const patch = (locale: Locale, p: Partial<{ title: string; description: string }>) =>
    setDraft((d) => ({
      ...d,
      translations: {
        ...d.translations,
        [locale]: { title: '', ...(d.translations[locale] ?? {}), ...p },
      },
    }));

  return (
    <Dialog
      title={download ? '編輯文件' : '新增文件'}
      onClose={onClose}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          disabled={!draft.mediaId}
          onSave={() => save.mutate()}
          danger={
            download && (
              <button
                type="button"
                className="btn btn-sm btn-danger mr-auto"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm('刪除後無法復原。檔案本身會留在媒體庫。確定要刪除嗎？'))
                    remove.mutate();
                }}
              >
                刪除
              </button>
            )
          }
        />
      }
    >
      <Field label="檔案" required hint="直接上傳 PDF。刪除這筆下載不會刪掉檔案本身。">
        <FileField
          mediaId={draft.mediaId}
          fileName={fileName ?? (download?.fileUrl ? download.fileUrl.split('/').pop() : null)}
          onChange={(m) => {
            setFileName(m?.fileName ?? null);
            setDraft((d) => ({ ...d, mediaId: m?.id ?? null }));
          }}
        />
      </Field>

      <FieldRow>
        <Field label="類型" required>
          <select
            className="form-control"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: Number(e.target.value) })}
          >
            <option value={1}>型錄</option>
            <option value={2}>使用說明</option>
            <option value={3}>認證文件</option>
          </select>
        </Field>
        <Field
          label="檔案語言"
          required
          hint="檔案本身的語言，與介面語系無關 —— 中文站也可能列出 EN 型錄，那不是漏翻。"
        >
          <select
            className="form-control"
            value={draft.fileLocale}
            onChange={(e) => setDraft({ ...draft, fileLocale: e.target.value })}
          >
            <option value="en">en</option>
            <option value="zh-TW">zh-TW</option>
          </select>
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="狀態">
          <StatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} />
        </Field>
        <Field label="排序">
          <input
            type="number"
            className="form-control mono"
            value={draft.sortOrder}
            onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
          />
        </Field>
      </FieldRow>

      <TranslationTabs
        translations={draft.translations}
        hasContent={(v) => Boolean(v?.title?.trim())}
        onRemove={(locale) =>
          setDraft((d) => ({ ...d, translations: { ...d.translations, [locale]: null } }))
        }
      >
        {(locale) => {
          const tr = draft.translations[locale] ?? { title: '' };
          return (
            <>
              <Field label="標題" required>
                <input
                  className="form-control"
                  value={tr.title}
                  onChange={(e) => patch(locale, { title: e.target.value })}
                />
              </Field>
              <Field label="說明">
                <textarea
                  className="form-control"
                  rows={3}
                  value={tr.description ?? ''}
                  onChange={(e) => patch(locale, { description: e.target.value })}
                />
              </Field>
            </>
          );
        }}
      </TranslationTabs>
    </Dialog>
  );
}
