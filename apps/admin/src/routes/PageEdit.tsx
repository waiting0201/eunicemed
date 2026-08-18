import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminPageSection } from '@/lib/api';
import { SchemaForm } from '@/components/form/SchemaForm';
import { LocaleTabs, LOCALES, type Locale } from '@/components/LocaleTabs';
import { Icon } from '@/components/Icon';
import { sectionTitle } from '@/lib/schema';
import { PAGE_LABELS } from '@/lib/pages';
import { formatDateTime } from '@/lib/format';
import { levelOf, type LocaleLevels } from '@/lib/completeness';

/**
 * 頁面區段編輯。
 *
 * <p>
 * 表單完全由 `GET /admin/page-schema/{key}` 生成 —— 加一個區段只要放一個 schema 檔，
 * 前端不用改（docs/03 §8）。
 * </p>
 *
 * <p>
 * **一次存一個區段一個語系**，與後端的 `PUT .../sections/{sectionKey}` 一致。
 * 整頁一起送的話，某一段驗證失敗會讓其他段的修改也一起被退回。
 * </p>
 */
export function PageEdit() {
  const { key = '' } = useParams<{ key: string }>();
  const queryClient = useQueryClient();

  const [locale, setLocale] = useState<Locale>('zh-TW');
  const [active, setActive] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [pickedUrls, setPickedUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const page = useQuery({ queryKey: ['page', key], queryFn: () => api.page(key) });
  const schema = useQuery({ queryKey: ['page-schema', key], queryFn: () => api.pageSchema(key) });

  const mediaUrls = useQuery({
    queryKey: ['media-all'],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  const sections = page.data?.sections ?? [];

  useEffect(() => {
    if (!active && sections.length > 0) setActive(sections[0].sectionKey);
  }, [active, sections]);

  // 切換區段或語系時，草稿從伺服器資料重新起算
  const draftKey = `${active}:${locale}`;
  const current = sections.find((s) => s.sectionKey === active);
  const serverData = current?.translations[locale] ?? {};
  const data = drafts[draftKey] ?? serverData;

  const save = useMutation({
    mutationFn: () =>
      api.saveSection(key, active!, { locale, data, syncInvariantFields: true }),
    onSuccess: () => {
      setError(null);
      setErrors([]);
      setSavedKey(draftKey);
      window.setTimeout(() => setSavedKey(null), 2500);
      setDrafts((d) => {
        const next = { ...d };
        delete next[draftKey];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['page', key] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : '儲存失敗。');
      // 後端的 errors 每項以 JSON Pointer 開頭定位欄位 —— 原樣顯示比重新措辭有用
      setErrors(err instanceof ApiError ? err.errors : []);
    },
  });

  const removeLocale = useMutation({
    mutationFn: () => api.deleteSectionLocale(key, active!, locale),
    onSuccess: () => {
      setDrafts((d) => {
        const next = { ...d };
        delete next[draftKey];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['page', key] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : '移除失敗。'),
  });

  const toggle = useMutation({
    mutationFn: (isEnabled: boolean) => api.toggleSection(key, active!, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page', key] }),
  });

  const levels = useMemo(
    () => (current ? sectionLevels(current, schema.data?.sections[current.sectionKey]) : {}),
    [current, schema.data],
  );

  if (page.isPending || schema.isPending) {
    return <p style={{ color: 'var(--text-muted)' }}>載入中…</p>;
  }

  const meta = PAGE_LABELS[key];
  const sectionSchema = active ? schema.data?.sections[active] : undefined;
  const dirty = draftKey in drafts;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/pages" className="eyebrow inline-flex items-center gap-1">
            <Icon name="back" className="icon icon-sm" />
            頁面內容
          </Link>
          <h1 className="page-title">{meta?.label ?? key}</h1>
          <p className="text-[0.82rem]" style={{ color: 'var(--text-muted)' }}>
            {meta?.path ? <span className="mono">{meta.path}</span> : meta?.note}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedKey === draftKey && (
            <span className="badge" style={{ color: 'var(--green)' }}>
              <Icon name="check" className="icon icon-sm" />
              已儲存
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!dirty || save.isPending || !active}
            onClick={() => save.mutate()}
          >
            {save.isPending ? '儲存中…' : dirty ? '儲存這個區段' : '沒有變更'}
          </button>
        </div>
      </header>

      {error && (
        <div className="alert mb-4" role="alert">
          <p className="font-medium">{error}</p>
          {errors.map((e) => (
            <p key={e} className="mono mt-1">
              {e}
            </p>
          ))}
        </div>
      )}

      {sections.length === 0 && (
        <div className="panel panel-body">
          <p className="font-medium">這一頁還沒有可編輯的區段。</p>
          <p className="form-hint mt-1">
            區段由 <span className="mono">Api/PageSchemas/{'{'}pageKey{'}'}.{'{'}sectionKey{'}'}.json</span>{' '}
            決定，Function App 啟動時同步建立。這一頁的 schema 檔還沒撰寫 ——
            前台目前是用寫死的文案渲染，不是壞掉。
          </p>
        </div>
      )}

      <div
        className="grid gap-5 lg:grid-cols-[15rem_1fr] lg:items-start"
        hidden={sections.length === 0}
      >
        {/* 區段清單。順序即前台的版面順序，不可增刪（由 schema 目錄決定）*/}
        <nav className="panel overflow-hidden">
          {sections.map((section) => {
            const on = section.sectionKey === active;
            const title = sectionTitle(schema.data?.sections[section.sectionKey], section.sectionKey);
            const translated = LOCALES.filter((l) => section.translations[l]).length;

            return (
              <button
                key={section.sectionKey}
                type="button"
                onClick={() => setActive(section.sectionKey)}
                className="block w-full px-4 py-2.5 text-left text-[0.88rem]"
                style={{
                  borderLeft: `3px solid ${on ? 'var(--accent)' : 'transparent'}`,
                  background: on ? 'var(--bg-elevated)' : undefined,
                  fontWeight: on ? 600 : 400,
                  opacity: section.isEnabled ? 1 : 0.55,
                }}
              >
                <span className="block truncate">{title}</span>
                <span className="mono block text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>
                  {section.isEnabled ? `${translated}/${LOCALES.length} 語系` : '已停用'}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {!sectionSchema && (
            <p className="alert">
              找不到「{active}」的 schema。這通常表示 `Api/PageSchemas/` 少了對應的檔案，
              或檔名與區段代碼不一致。
            </p>
          )}

          {sectionSchema && current && (
            <div className="panel">
              <LocaleTabs active={locale} onChange={setLocale} levels={levels} />

              <div className="panel-body">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[0.95rem] font-semibold">
                      {sectionTitle(sectionSchema, current.sectionKey)}
                    </h2>
                    {sectionSchema.description && (
                      <p className="form-hint">{sectionSchema.description}</p>
                    )}
                  </div>

                  {/* 停用的區段仍會回傳給後台預覽，但前台不渲染（docs/04 §6）*/}
                  <label className="flex shrink-0 items-center gap-2 text-[0.85rem]">
                    <input
                      type="checkbox"
                      checked={current.isEnabled}
                      onChange={(e) => toggle.mutate(e.target.checked)}
                    />
                    在前台顯示
                  </label>
                </div>

                {current.translations[locale] ? (
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      style={{ color: 'var(--red)' }}
                      disabled={removeLocale.isPending}
                      onClick={() => removeLocale.mutate()}
                    >
                      移除這個語系的內容
                    </button>
                  </div>
                ) : (
                  <p className="form-hint mb-4">
                    這個語系還沒有內容。填寫並儲存後，前台的該語系才會顯示這個區段。
                  </p>
                )}

                <SchemaForm
                  schema={sectionSchema}
                  value={data}
                  onChange={(next) => setDrafts((d) => ({ ...d, [draftKey]: next }))}
                  mediaUrls={{ ...(mediaUrls.data ?? {}), ...pickedUrls }}
                  onPickMedia={(media) =>
                    setPickedUrls((u) => ({ ...u, [media.id]: media.url }))
                  }
                />

                <p className="form-hint mt-4">
                  最後更新 {formatDateTime(current.updatedAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * 區段在各語系的完整度。
 *
 * <p>
 * ⚠️ 第 1 段的判準是 **schema 的 `required` 是否都有值** ——
 * 與後端 `PageHandler.IsRenderable` 同一條線。跨語系同步會為未翻譯的語系
 * 補建只含圖片的列，那種列「存在」但前台不渲染；兩邊判準不一致的話，
 * 後台會顯示「有內容」而前台是空白。
 * </p>
 */
function sectionLevels(
  section: AdminPageSection,
  schema: { required?: string[] } | undefined,
): LocaleLevels {
  const required = schema?.required ?? [];

  return Object.fromEntries(
    LOCALES.map((locale) => {
      const data = section.translations[locale];
      if (!data) return [locale, 0];

      const filled = (name: string) => {
        const v = data[name];
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'string') return v.trim().length > 0;
        return true;
      };

      const renderable = required.every(filled);
      const complete = Object.keys(schema ?? {}).length === 0 || Object.values(data).filter(Boolean).length >= required.length + 1;

      return [locale, levelOf([renderable, renderable && complete, renderable && complete])];
    }),
  ) as LocaleLevels;
}
