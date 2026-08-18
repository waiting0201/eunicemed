import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminSalesLocation } from '@/lib/api';
import { DataTable, FilterGroup, ListPage, MissingCount } from '@/components/ListPage';
import { Dialog, DialogActions } from '@/components/Dialog';
import { Field, FieldRow } from '@/components/form/Field';
import { LocaleGauges } from '@/components/Gauge';
import { StatusSelect } from '@/components/StatusSelect';
import { StatusTag } from '@/components/StatusTag';
import { TranslationTabs } from '@/components/TranslationTabs';
import { describeLevel, levelOf } from '@/lib/completeness';
import type { Locale } from '@/components/LocaleTabs';

/** 台灣／國際兩分頁（docs/03 §5）—— 兩者的欄位重點不同，分開看比混在一起清楚。 */
const TYPES = [
  { value: '1', label: '台灣' },
  { value: '2', label: '國際' },
] as const;

export function Locations() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>('1');
  const [editing, setEditing] = useState<AdminSalesLocation | 'new' | null>(null);

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
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          新增據點
        </button>
      }
      filters={<FilterGroup value={type} options={[...TYPES]} onChange={setType} />}
    >
      <DataTable
        columns={6}
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
            <th className="w-20" />
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
              <td>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(l)}>
                  編輯
                </button>
              </td>
            </tr>
          );
        })}
      </DataTable>

      {editing && (
        <LocationDialog
          location={editing === 'new' ? null : editing}
          defaultType={Number(type)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['sales-locations'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            setEditing(null);
          }}
        />
      )}
    </ListPage>
  );
}

type LocationTranslation = {
  name: string;
  address?: string | null;
  regionLabel?: string | null;
  note?: string | null;
};

type LocationDraft = {
  locationType: number;
  countryCode: string;
  websiteUrl: string;
  phone: string;
  status: number;
  sortOrder: number;
  translations: Record<string, LocationTranslation | null>;
};

function LocationDialog({
  location,
  defaultType,
  onClose,
  onSaved,
}: {
  location: AdminSalesLocation | null;
  defaultType: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<LocationDraft>({
    locationType: location?.locationType ?? defaultType,
    countryCode: location?.countryCode ?? (defaultType === 1 ? 'TW' : ''),
    websiteUrl: location?.websiteUrl ?? '',
    phone: location?.phone ?? '',
    status: location?.status ?? 1,
    sortOrder: location?.sortOrder ?? 0,
    translations: location ? { ...location.translations } : { en: { name: '' } },
  });
  const [error, setError] = useState<string | null>(null);

  const international = draft.locationType === 2;

  const save = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const body = {
        ...draft,
        countryCode: draft.countryCode.trim().toUpperCase(),
        websiteUrl: draft.websiteUrl.trim() || null,
        phone: draft.phone.trim() || null,
        // null 是「不動它」，清空要用明確旗標
        clearWebsiteUrl: draft.websiteUrl.trim() === '',
        clearPhone: draft.phone.trim() === '',
      };
      if (location) await api.saveSalesLocation(location.id, body);
      else await api.createSalesLocation(body);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  const remove = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      if (location) await api.deleteSalesLocation(location.id);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '刪除失敗。'),
  });

  const patch = (locale: Locale, p: Partial<LocationTranslation>) =>
    setDraft((d) => ({
      ...d,
      translations: {
        ...d.translations,
        [locale]: { name: '', ...(d.translations[locale] ?? {}), ...p },
      },
    }));

  return (
    <Dialog
      title={location ? '編輯據點' : '新增據點'}
      onClose={onClose}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          disabled={draft.countryCode.trim().length !== 2}
          onSave={() => save.mutate()}
          danger={
            location && (
              <button
                type="button"
                className="btn btn-sm btn-danger mr-auto"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm('刪除後無法復原。確定要刪除這個據點嗎？')) remove.mutate();
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
        <Field label="類型" required>
          <select
            className="form-control"
            value={draft.locationType}
            onChange={(e) => setDraft({ ...draft, locationType: Number(e.target.value) })}
          >
            <option value={1}>台灣通路</option>
            <option value={2}>國際經銷</option>
          </select>
        </Field>
        <Field label="國別代碼" required hint="兩碼 ISO 3166-1，如 TW、JP、DE。">
          <input
            className="form-control mono"
            maxLength={2}
            value={draft.countryCode}
            onChange={(e) => setDraft({ ...draft, countryCode: e.target.value.toUpperCase() })}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="電話">
          <input
            className="form-control mono"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </Field>
        <Field label="網站">
          <input
            className="form-control mono"
            placeholder="https://"
            value={draft.websiteUrl}
            onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
          />
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
        hasContent={(v) => Boolean(v?.name?.trim())}
        onRemove={(locale) =>
          setDraft((d) => ({ ...d, translations: { ...d.translations, [locale]: null } }))
        }
      >
        {(locale) => {
          const tr = draft.translations[locale] ?? { name: '' };
          return (
            <>
              <Field label="名稱" required>
                <input
                  className="form-control"
                  value={tr.name}
                  onChange={(e) => patch(locale, { name: e.target.value })}
                />
              </Field>
              <Field label="地址">
                <textarea
                  className="form-control"
                  rows={2}
                  value={tr.address ?? ''}
                  onChange={(e) => patch(locale, { address: e.target.value })}
                />
              </Field>
              {international && (
                <Field
                  label="地區標籤"
                  hint="前台用這個字串分組。留空的會被歸到「其他地區」那一組。"
                >
                  <input
                    className="form-control"
                    value={tr.regionLabel ?? ''}
                    onChange={(e) => patch(locale, { regionLabel: e.target.value })}
                  />
                </Field>
              )}
              <Field label="備註">
                <input
                  className="form-control"
                  value={tr.note ?? ''}
                  onChange={(e) => patch(locale, { note: e.target.value })}
                />
              </Field>
            </>
          );
        }}
      </TranslationTabs>
    </Dialog>
  );
}
