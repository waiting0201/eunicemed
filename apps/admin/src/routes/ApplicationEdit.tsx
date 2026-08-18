import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ApiError,
  type AdminApplication,
  type ApplicationTranslation,
} from '@/lib/api';
import { Field, FieldRow } from '@/components/form/Field';
import { Repeater } from '@/components/form/Repeater';
import { MultiSelect } from '@/components/form/MultiSelect';
import { ImageField } from '@/components/MediaPicker';
import { BodyMapPicker, type GhostSpot } from '@/components/BodyMapPicker';
import { LocaleTabs, LOCALES, type Locale } from '@/components/LocaleTabs';
import { StatusTag } from '@/components/StatusTag';
import { Icon } from '@/components/Icon';
import { levelOf } from '@/lib/completeness';
import type { GaugeLevel } from '@/components/Gauge';
import { formatDateTime } from '@/lib/format';

/**
 * 應用方案編輯。
 *
 * <p>
 * 兩種型態走同一頁：**依部位**（`type=1`，會出現在首頁人體圖上）與
 * **特殊照護**（`type=2`，卡片列表）。差別在畫面上要看得出來 ——
 * 只有依部位有部位關聯與人體圖座標，只有特殊照護用得到卡片圖。
 * </p>
 *
 * <p>
 * 應用方案**沒有排程發布**（`Application` 沒有 `PublishedAt`，docs/05 §3.9），
 * 狀態就是全部 —— 不要照抄文章那一套。
 * </p>
 */
export function ApplicationEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [locale, setLocale] = useState<Locale>('en');
  const [draft, setDraft] = useState<AdminApplication | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pickedUrls, setPickedUrls] = useState<Record<string, string>>({});

  const { data, isPending } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.application(id!),
    enabled: Boolean(id) && !isNew,
  });

  /** 其他方案的座標 —— 放點時要看得見誰已經佔了哪裡 */
  const all = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.applications(),
    staleTime: 60_000,
  });

  const bodyParts = useQuery({
    queryKey: ['body-parts'],
    queryFn: () => api.bodyParts(),
    staleTime: 5 * 60_000,
  });

  const collections = useQuery({
    queryKey: ['collections'],
    queryFn: () => api.collections(),
    staleTime: 5 * 60_000,
  });

  const products = useQuery({
    queryKey: ['products', 'all-for-picker'],
    queryFn: () => api.products({ pageSize: '200' }),
    staleTime: 60_000,
  });

  const mediaUrls = useQuery({
    queryKey: ['media-all'],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  /**
   * 其他方案的座標要一筆一筆問（列表端點不回 mapPosition）。
   * 只在有必要時查：特殊照護不畫在人體圖上。
   */
  const ghosts = useQuery({
    queryKey: ['body-map-ghosts', id],
    queryFn: async (): Promise<GhostSpot[]> => {
      const others = (all.data ?? []).filter((a) => a.showOnBodyMap && a.id !== id);
      const rows = await Promise.all(others.map((a) => api.application(a.id).catch(() => null)));
      return rows.flatMap((a) =>
        a?.mapPosition
          ? [{ slug: a.slug, name: a.translations.en?.name ?? a.slug, map: a.mapPosition }]
          : [],
      );
    },
    enabled: Boolean(all.data) && draft?.type === 1,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isNew) {
      setDraft(blankApplication());
      return;
    }
    if (data) {
      setDraft(data);
      setRemoved([]);
    }
  }, [data, isNew]);

  const save = useMutation({
    mutationFn: (body: unknown) =>
      isNew ? api.createApplication(body) : api.saveApplication(id!, body),
    onSuccess: (result) => {
      setError(null);
      setErrors([]);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });

      if (isNew) {
        navigate(`/applications/${result.id}`, { replace: true });
        return;
      }
      setDraft(result);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : '存檔失敗。');
      setErrors(err instanceof ApiError ? err.errors : []);
    },
  });

  const publish = useMutation({
    mutationFn: (next: 'publish' | 'unpublish') =>
      next === 'publish' ? api.publishApplication(id!) : api.unpublishApplication(id!),
    onSuccess: (result) => {
      setDraft(result);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : '操作失敗。'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteApplication(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      navigate('/applications');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : '刪除失敗。'),
  });

  if ((isPending && !isNew) || !draft) {
    return <p style={{ color: 'var(--text-muted)' }}>載入中…</p>;
  }

  const byBodyPart = draft.type === 1;
  const tr: ApplicationTranslation = draft.translations[locale] ?? { name: '' };
  const hasTranslation = locale in draft.translations;

  const patch = (next: Partial<AdminApplication>) => setDraft({ ...draft, ...next });
  const patchTr = (next: Partial<ApplicationTranslation>) =>
    setDraft({ ...draft, translations: { ...draft.translations, [locale]: { ...tr, ...next } } });

  const urls = { ...(mediaUrls.data ?? {}), ...pickedUrls };
  const levels = Object.fromEntries(
    LOCALES.map((l) => [l, applicationLevel(draft.translations[l])]),
  ) as Record<string, GaugeLevel>;

  // 這一條是這頁最重要的提醒：勾了要上人體圖卻沒放座標，發布會被擋，
  // 而擋下來的訊息出現在存檔之後 —— 在這裡先說
  const missingPosition = byBodyPart && draft.showOnBodyMap && !draft.mapPosition;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/applications" className="eyebrow inline-flex items-center gap-1">
            <Icon name="back" className="icon icon-sm" />
            應用方案
          </Link>
          <h1 className="page-title truncate">
            {draft.translations.en?.name ??
              draft.translations['zh-TW']?.name ??
              (isNew ? '新方案' : '（未命名）')}
          </h1>
          <p className="mono text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>
            {byBodyPart ? '依部位' : '特殊照護'} · {draft.slug || '（尚未設定網址代稱）'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="badge" style={{ color: 'var(--green)' }}>
              <Icon name="check" className="icon icon-sm" />
              已儲存
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              save.isPending || !draft.slug.trim() || (byBodyPart && !draft.bodyPartId)
            }
            onClick={() => save.mutate(toRequest(draft, removed))}
          >
            {save.isPending ? '儲存中…' : isNew ? '建立' : '儲存'}
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

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="min-w-0">
          <div className="panel mb-5">
            <div className="panel-header">
              <h2 className="text-[0.95rem] font-semibold">基本資料</h2>
            </div>
            <div className="panel-body">
              <FieldRow>
                <Field label="型態" required hint="依部位會出現在首頁人體圖；特殊照護是卡片列表。">
                  <select
                    className="form-control"
                    value={draft.type}
                    disabled={!isNew}
                    onChange={(e) => {
                      const type = Number(e.target.value);
                      // 換成特殊照護就沒有部位與座標可言，一併清掉
                      patch(
                        type === 1
                          ? { type }
                          : { type, bodyPartId: null, showOnBodyMap: false, mapPosition: null },
                      );
                    }}
                  >
                    <option value={1}>依部位</option>
                    <option value={2}>特殊照護</option>
                  </select>
                </Field>
                <Field label="網址代稱 slug" required hint="全站唯一。改了會讓舊網址失效。">
                  <input
                    className="form-control mono"
                    value={draft.slug}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                </Field>
              </FieldRow>

              <FieldRow>
                {byBodyPart && (
                  <Field
                    label="對應部位"
                    required
                    hint="依部位的方案一定要指定 —— 沒有它，推薦產品與產品數會永遠是 0。"
                  >
                    <select
                      className="form-control"
                      value={draft.bodyPartId ?? ''}
                      onChange={(e) => patch({ bodyPartId: e.target.value || null })}
                    >
                      {/* 沒有「不指定」選項：後端對 type=1 直接擋，
                          留一個選得下去卻存不了的選項只是把錯誤延後到存檔 */}
                      {!draft.bodyPartId && <option value="">請選擇部位</option>}
                      {(bodyParts.data ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nameZhTw || b.nameEn}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="排序">
                  <input
                    type="number"
                    className="form-control mono"
                    value={draft.sortOrder}
                    onChange={(e) => patch({ sortOrder: Number(e.target.value) })}
                  />
                </Field>
              </FieldRow>

              <FieldRow>
                <Field label="頁首圖" hint="方案內頁 hero 右側的直式照片。">
                  <ImageField
                    presetKey="portrait-4x5"
                    mediaId={draft.imageMediaId}
                    url={draft.imageMediaId ? urls[draft.imageMediaId] : null}
                    onChange={(m) => {
                      if (m) setPickedUrls((u) => ({ ...u, [m.id]: m.url }));
                      patch({ imageMediaId: m?.id ?? null });
                    }}
                  />
                </Field>
                <Field
                  label={byBodyPart ? '卡片圖（依部位用不到）' : '卡片圖'}
                  hint={
                    byBodyPart
                      ? '只有特殊照護的卡片列表會用到這張。'
                      : '應用方案頁「特殊照護」那一排卡片的圖。'
                  }
                >
                  <ImageField
                    presetKey="card-16x10"
                    mediaId={draft.cardImageMediaId}
                    url={draft.cardImageMediaId ? urls[draft.cardImageMediaId] : null}
                    onChange={(m) => {
                      if (m) setPickedUrls((u) => ({ ...u, [m.id]: m.url }));
                      patch({ cardImageMediaId: m?.id ?? null });
                    }}
                  />
                </Field>
              </FieldRow>

              <Field label="穿戴示範圖" hint="「如何選擇與穿戴」區塊右側的照片。">
                <ImageField
                  presetKey="wide-16x10"
                  mediaId={draft.fittingImageMediaId}
                  url={draft.fittingImageMediaId ? urls[draft.fittingImageMediaId] : null}
                  onChange={(m) => {
                    if (m) setPickedUrls((u) => ({ ...u, [m.id]: m.url }));
                    patch({ fittingImageMediaId: m?.id ?? null });
                  }}
                />
              </Field>

              <MultiSelect
                label="推薦產品"
                options={products.data?.items ?? []}
                selected={draft.productIds}
                onChange={(productIds) => patch({ productIds })}
                keyOf={(p) => p.id}
                labelOf={(p) => p.nameEn ?? p.nameZhTw ?? p.slug}
                hint="不足時前台會自動以同部位的產品遞補，所以這裡留空也不會是空區塊。"
              />
            </div>
          </div>

          {byBodyPart && (
            <div className="panel mb-5">
              <div className="panel-header">
                <h2 className="text-[0.95rem] font-semibold">首頁人體圖</h2>
                <label className="flex items-center gap-2 text-[0.85rem]">
                  <input
                    type="checkbox"
                    checked={draft.showOnBodyMap}
                    onChange={(e) => patch({ showOnBodyMap: e.target.checked })}
                  />
                  顯示在人體圖上
                </label>
              </div>

              <div className="panel-body">
                {missingPosition && (
                  <p role="alert" className="alert mb-4">
                    勾了要顯示但還沒放座標。這樣發布會被擋下來 ——
                    因為前台拿不到 cx/cy，那個熱區會靜默不畫。
                  </p>
                )}

                {draft.showOnBodyMap ? (
                  <BodyMapPicker
                    value={draft.mapPosition}
                    ghosts={ghosts.data ?? []}
                    label={
                      draft.translations.en?.name ?? draft.translations['zh-TW']?.name ?? draft.slug
                    }
                    onChange={(mapPosition) => patch({ mapPosition })}
                  />
                ) : (
                  <p className="form-hint">
                    這個方案不顯示在人體圖上。內頁仍然存在，只是首頁那張圖上沒有它的熱區。
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="panel mb-5">
            <div className="panel-header">
              <h2 className="text-[0.95rem] font-semibold">內容</h2>
              <LocaleTabs active={locale} onChange={setLocale} levels={levels} />
            </div>

            <div className="panel-body">
              {!hasTranslation && (
                <p className="form-hint mb-4">
                  這個語系還沒有內容。填了名稱並儲存之後，這個方案才會出現在該語系的前台。
                </p>
              )}

              <Field label="名稱" required>
                <input
                  className="form-control"
                  value={tr.name}
                  onChange={(e) => patchTr({ name: e.target.value })}
                />
              </Field>

              <Field label="前言" hint="頁首標題底下那一段。">
                <textarea
                  className="form-control"
                  rows={2}
                  value={tr.lead ?? ''}
                  onChange={(e) => patchTr({ lead: e.target.value })}
                />
              </Field>

              {byBodyPart && (
                <FieldRow>
                  <Field label="人體圖面板文案" hint="首頁點到這個熱區時，右側面板顯示的一段話。">
                    <textarea
                      className="form-control"
                      rows={2}
                      value={tr.mapCopy ?? ''}
                      onChange={(e) => patchTr({ mapCopy: e.target.value })}
                    />
                  </Field>
                  <Field label="人體圖按鈕文字" hint="留空時前台用預設的「查看解決方案」。">
                    <input
                      className="form-control"
                      value={tr.mapCtaLabel ?? ''}
                      onChange={(e) => patchTr({ mapCtaLabel: e.target.value })}
                    />
                  </Field>
                </FieldRow>
              )}

              <Repeater
                label="頁首數字"
                items={tr.stats ?? []}
                onChange={(stats) => patchTr({ stats })}
                create={() => ({ value: '', label: '' })}
                max={3}
                renderItem={(item, update) => (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="form-control mono"
                      placeholder="數字（填 auto 由系統代入產品數）"
                      value={item.value ?? ''}
                      onChange={(e) => update({ value: e.target.value })}
                    />
                    <input
                      className="form-control"
                      placeholder="說明"
                      value={item.label ?? ''}
                      onChange={(e) => update({ label: e.target.value })}
                    />
                  </div>
                )}
              />

              <Repeater
                label="常見困擾"
                items={tr.concerns ?? []}
                onChange={(concerns) => patchTr({ concerns })}
                create={() => ({ title: '', body: '' })}
                max={6}
                renderItem={(item, update) => (
                  <>
                    <input
                      className="form-control mb-2"
                      placeholder="標題"
                      value={item.title ?? ''}
                      onChange={(e) => update({ title: e.target.value })}
                    />
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="說明"
                      value={item.body ?? ''}
                      onChange={(e) => update({ body: e.target.value })}
                    />
                  </>
                )}
              />

              <Repeater
                label="支撐等級"
                items={tr.supportLevels ?? []}
                onChange={(supportLevels) => patchTr({ supportLevels })}
                create={() => ({ collectionSlug: '', body: '', bestFor: '', linkUrl: '' })}
                max={3}
                renderItem={(item, update) => (
                  <>
                    <div className="mb-2 grid gap-2 sm:grid-cols-2">
                      <select
                        className="form-control"
                        value={item.collectionSlug ?? ''}
                        onChange={(e) => update({ collectionSlug: e.target.value })}
                      >
                        <option value="">選擇系列</option>
                        {(collections.data ?? []).map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.translations['zh-TW']?.name ?? c.slug}
                          </option>
                        ))}
                      </select>
                      <input
                        className="form-control mono"
                        placeholder="連結（可帶篩選參數）"
                        value={item.linkUrl ?? ''}
                        onChange={(e) => update({ linkUrl: e.target.value })}
                      />
                    </div>
                    <textarea
                      className="form-control mb-2"
                      rows={2}
                      placeholder="說明"
                      value={item.body ?? ''}
                      onChange={(e) => update({ body: e.target.value })}
                    />
                    <input
                      className="form-control"
                      placeholder="適合對象"
                      value={item.bestFor ?? ''}
                      onChange={(e) => update({ bestFor: e.target.value })}
                    />
                  </>
                )}
              />

              <Repeater
                label="如何選擇與穿戴"
                items={tr.howTo ?? []}
                onChange={(howTo) => patchTr({ howTo })}
                create={() => ({ title: '', body: '' })}
                max={5}
                renderItem={(item, update) => (
                  <>
                    <input
                      className="form-control mb-2"
                      placeholder="步驟標題（前台自動編號）"
                      value={item.title ?? ''}
                      onChange={(e) => update({ title: e.target.value })}
                    />
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="說明"
                      value={item.body ?? ''}
                      onChange={(e) => update({ body: e.target.value })}
                    />
                  </>
                )}
              />

              <Field label="內文" hint="可用 p strong em ul ol li a blockquote，其餘標籤會在伺服器被移除。">
                <textarea
                  className="form-control mono"
                  rows={8}
                  value={tr.body ?? ''}
                  onChange={(e) => patchTr({ body: e.target.value })}
                />
              </Field>

              <Field label="醫療免責" hint="留空時套用共用區段的全站預設文字。">
                <textarea
                  className="form-control"
                  rows={2}
                  value={tr.disclaimer ?? ''}
                  onChange={(e) => patchTr({ disclaimer: e.target.value })}
                />
              </Field>

              <FieldRow>
                <Field label="SEO 標題">
                  <input
                    className="form-control"
                    value={tr.seoTitle ?? ''}
                    onChange={(e) => patchTr({ seoTitle: e.target.value })}
                  />
                </Field>
                <Field label="SEO 敘述">
                  <input
                    className="form-control"
                    value={tr.seoDescription ?? ''}
                    onChange={(e) => patchTr({ seoDescription: e.target.value })}
                  />
                </Field>
              </FieldRow>

              {hasTranslation && Object.keys(draft.translations).length > 1 && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost mt-2"
                  style={{ color: 'var(--red)' }}
                  onClick={() => {
                    if (!confirm(`移除 ${locale} 的內容？儲存後這個方案在該語系的前台會消失。`))
                      return;
                    const next = { ...draft.translations };
                    delete next[locale];
                    setDraft({ ...draft, translations: next });
                    setRemoved((r) => [...new Set([...r, locale])]);
                  }}
                >
                  移除這個語系
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="panel lg:sticky lg:top-[calc(var(--app-header-height)+1.25rem)]">
          <div className="panel-header">
            <h2 className="text-[0.95rem] font-semibold">狀態</h2>
            <StatusTag status={draft.status} />
          </div>

          <div className="panel-body">
            {isNew ? (
              <p className="form-hint">建立後才能發布。</p>
            ) : draft.status === 1 ? (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                disabled={publish.isPending}
                onClick={() => publish.mutate('unpublish')}
              >
                取消發布
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={publish.isPending}
                onClick={() => publish.mutate('publish')}
              >
                發布
              </button>
            )}

            {/* 應用方案沒有 PublishedAt —— 這裡沒有排程欄位是刻意的 */}
            {!isNew && (
              <>
                <dl className="mt-4 space-y-2 text-[0.82rem]">
                  <Meta label="最後更新" value={formatDateTime(draft.updatedAt)} />
                  <Meta label="推薦產品" value={`${draft.productIds.length} 筆`} />
                  <Meta
                    label="人體圖"
                    value={
                      !byBodyPart
                        ? '不適用'
                        : draft.showOnBodyMap
                          ? draft.mapPosition
                            ? `${draft.mapPosition.hotspot.cx}, ${draft.mapPosition.hotspot.cy}`
                            : '缺座標'
                          : '不顯示'
                    }
                  />
                </dl>

                <button
                  type="button"
                  className="btn btn-ghost btn-block mt-4"
                  style={{ color: 'var(--red)' }}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm('刪除這個方案？前台的網址會變成 404，記得到「轉址」補一條規則。'))
                      remove.mutate();
                  }}
                >
                  刪除方案
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function blankApplication(): AdminApplication {
  return {
    id: '',
    slug: '',
    type: 1,
    bodyPartId: null,
    imageMediaId: null,
    cardImageMediaId: null,
    fittingImageMediaId: null,
    showOnBodyMap: false,
    mapPosition: null,
    status: 0,
    sortOrder: 0,
    productIds: [],
    translations: { en: { name: '' } },
    rowVersion: null,
    createdAt: '',
    updatedAt: '',
  };
}

function toRequest(draft: AdminApplication, removed: string[]) {
  return {
    slug: draft.slug.trim(),
    type: draft.type,
    bodyPartId: draft.bodyPartId,
    clearBodyPart: draft.bodyPartId === null,
    imageMediaId: draft.imageMediaId,
    clearImage: draft.imageMediaId === null,
    cardImageMediaId: draft.cardImageMediaId,
    clearCardImage: draft.cardImageMediaId === null,
    fittingImageMediaId: draft.fittingImageMediaId,
    clearFittingImage: draft.fittingImageMediaId === null,
    showOnBodyMap: draft.showOnBodyMap,
    mapPosition: draft.mapPosition,
    clearMapPosition: draft.mapPosition === null,
    sortOrder: draft.sortOrder,
    productIds: draft.productIds,
    translations: {
      ...draft.translations,
      ...Object.fromEntries(removed.map((l) => [l, null])),
    },
    rowVersion: draft.rowVersion,
  };
}

function applicationLevel(tr?: ApplicationTranslation): GaugeLevel {
  return levelOf([
    Boolean(tr?.name),
    Boolean(tr?.lead && (tr?.concerns?.length ?? 0) > 0),
    Boolean(tr?.seoTitle && tr?.seoDescription),
  ]);
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  );
}
