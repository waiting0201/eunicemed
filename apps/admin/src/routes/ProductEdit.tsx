import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminProduct, type ProductTranslation } from '@/lib/api';
import { Field, FieldRow } from '@/components/form/Field';
import { Repeater } from '@/components/form/Repeater';
import { MultiSelect } from '@/components/form/MultiSelect';
import { SizeChartEditor } from '@/components/form/SizeChartEditor';
import { ImageField, ImageList } from '@/components/MediaPicker';
import { LocaleTabs, LOCALES, type Locale } from '@/components/LocaleTabs';
import { StatusTag } from '@/components/StatusTag';
import { Icon } from '@/components/Icon';
import { productLevel } from '@/lib/completeness';

/**
 * 產品編輯。**其餘編輯畫面沿用這個骨架**：
 * 左側主表單（語系分頁 + 各區塊），右側固定欄放狀態與動作。
 *
 * <p>
 * 三件在這個後台反覆出現的規則，都在這一頁定調：
 * </p>
 * <list type="number">
 * <item>**null 與空陣列是兩件事**（後端 `UpsertProductRequest`）——
 *       所以送出時只帶「這次真的改過」的欄位，不整份覆蓋。</item>
 * <item>**`rowVersion` 一定要帶**，否則兩個人同時編輯會靜默互相覆蓋。
 *       存檔後要用回傳的新值取代手上那份，不然下一次存檔會自撞 409。</item>
 * <item>**發布是獨立動作**，不混在存檔裡 —— Author 可以存草稿但不可發布。</item>
 * </list>
 */
export function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [locale, setLocale] = useState<Locale>('en');
  const [draft, setDraft] = useState<AdminProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  /**
   * 被移除的語系。**不能只是把 key 從 draft 拿掉** ——
   * 送出時「沒提到的語系」在後端是「不動它」，那樣刪不掉。
   * 要明確送 `{ "zh-TW": null }` 才是刪除。
   */
  const [removed, setRemoved] = useState<string[]>([]);
  /**
   * mediaId → url。產品詳情端點只回 mediaId，不回網址
   * （後台的圖庫是另一支端點）。使用者在選擇器裡挑過的圖先記在這裡，
   * 至少當次編輯看得到縮圖；重新整理後由下面的 mediaUrls 查詢補齊。
   */
  const [pickedUrls, setPickedUrls] = useState<Record<string, string>>({});

  const { data, isPending } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.product(id!),
    enabled: Boolean(id),
  });

  /**
   * 已存在的圖片網址。產品詳情只回 mediaId ——
   * 不查這一支的話，重新整理後圖庫會變成一排灰底空格。
   */
  const mediaUrls = useQuery({
    queryKey: ['media-all'],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  const taxonomy = useQuery({
    queryKey: ['taxonomy'],
    queryFn: async () => ({
      categories: await api.categories(),
      subCategories: await api.subCategories(),
      collections: await api.collections(),
      bodyParts: await api.bodyParts(),
      certifications: await api.certifications(),
    }),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (data) {
      setDraft(data);
      setRemoved([]);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (body: unknown) => api.saveProduct(id!, body),
    onSuccess: (result) => {
      // 用回傳值取代手上那份 —— rowVersion 已經前進，不換掉的話下次存檔會自撞 409
      setDraft(result);
      setError(null);
      setErrors([]);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : '存檔失敗。');
      setErrors(err instanceof ApiError ? err.errors : []);
    },
  });

  const publish = useMutation({
    mutationFn: (next: 'publish' | 'unpublish') =>
      next === 'publish' ? api.publishProduct(id!) : api.unpublishProduct(id!),
    onSuccess: (result) => {
      setDraft(result);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : '操作失敗。'),
  });

  const levels = useMemo(
    () =>
      Object.fromEntries(
        LOCALES.map((l) => [l, productLevel(draft?.translations[l])]),
      ) as Record<string, ReturnType<typeof productLevel>>,
    [draft],
  );

  if (isPending || !draft) {
    return <p style={{ color: 'var(--text-muted)' }}>載入中…</p>;
  }

  const hasTranslation = locale in draft.translations;
  const tr: ProductTranslation = draft.translations[locale] ?? { name: '' };

  const patch = (next: Partial<AdminProduct>) => setDraft({ ...draft, ...next });

  const patchTr = (next: Partial<ProductTranslation>) =>
    setDraft({
      ...draft,
      translations: { ...draft.translations, [locale]: { ...tr, ...next } },
    });

  const subCategories = (taxonomy.data?.subCategories ?? []).filter(
    (s) => s.categoryId === draft.categoryId,
  );

  const urls = { ...(mediaUrls.data ?? {}), ...pickedUrls };

  const remember = (media: { id: string; url: string } | null) =>
    media && setPickedUrls((u) => ({ ...u, [media.id]: media.url }));

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/products" className="eyebrow inline-flex items-center gap-1">
            <Icon name="back" className="icon icon-sm" />
            產品
          </Link>
          <h1 className="page-title truncate">
            {draft.translations.en?.name ?? draft.translations['zh-TW']?.name ?? '（未命名）'}
          </h1>
          <p className="mono text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>
            {draft.slug}
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
            disabled={save.isPending}
            onClick={() => save.mutate(toRequest(draft, removed))}
          >
            {save.isPending ? '儲存中…' : '儲存'}
          </button>
        </div>
      </header>

      {error && (
        <div className="alert mb-4" role="alert">
          <p className="font-medium">{error}</p>
          {/* 後端的 errors 每項以 JSON Pointer 開頭定位欄位，原樣顯示比重新措辭有用 */}
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
                <Field label="網址代稱 slug" required hint="全站唯一。改了會讓舊網址失效。">
                  <input
                    className="form-control mono"
                    value={draft.slug}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                </Field>
                <Field label="型號 SKU">
                  <input
                    className="form-control mono"
                    value={draft.sku ?? ''}
                    onChange={(e) => patch({ sku: e.target.value })}
                  />
                </Field>
              </FieldRow>

              <FieldRow>
                <Field label="分類" required>
                  <select
                    className="form-control"
                    value={draft.categoryId}
                    onChange={(e) =>
                      // 換分類時一併清掉子分類 —— 子分類必須屬於該分類，
                      // 留著舊的會在存檔時被後端以 400 退回
                      patch({ categoryId: e.target.value, subCategoryId: null })
                    }
                  >
                    {(taxonomy.data?.categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.translations['zh-TW']?.name ?? c.slug}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="子分類"
                  hint="決定產品網址的第三段。留空的話產品沒有可分享的三段網址。"
                >
                  <select
                    className="form-control"
                    value={draft.subCategoryId ?? ''}
                    onChange={(e) => patch({ subCategoryId: e.target.value || null })}
                  >
                    <option value="">（不指定）</option>
                    {subCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.translations['zh-TW']?.name ?? s.slug}
                      </option>
                    ))}
                  </select>
                </Field>
              </FieldRow>

              <FieldRow>
                <Field label="系列">
                  <select
                    className="form-control"
                    value={draft.collectionId ?? ''}
                    onChange={(e) => patch({ collectionId: e.target.value || null })}
                  >
                    <option value="">（不指定）</option>
                    {(taxonomy.data?.collections ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.translations['zh-TW']?.name ?? c.slug}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="排序">
                  <input
                    type="number"
                    className="form-control mono"
                    value={draft.sortOrder}
                    onChange={(e) => patch({ sortOrder: Number(e.target.value) })}
                  />
                </Field>
              </FieldRow>

              <label className="flex items-center gap-2 text-[0.9rem]">
                <input
                  type="checkbox"
                  checked={draft.isFeatured}
                  onChange={(e) => patch({ isFeatured: e.target.checked })}
                />
                首頁精選（依「精選排序」決定版位順序）
              </label>
            </div>
          </div>

          <div className="panel mb-5">
            <div className="panel-header">
              <h2 className="text-[0.95rem] font-semibold">圖片與關聯</h2>
            </div>
            <div className="panel-body">
              <span className="form-label">產品圖</span>
              <p className="form-hint mb-2">
                主圖同時決定列表卡與詳情頁的第一張圖 —— 換主圖兩邊會一起變。
              </p>
              <div className="mb-5">
                <ImageList
                  presetKey="square"
                  images={draft.images}
                  urls={urls}
                  onChange={(images) => patch({ images })}
                />
              </div>

              <Field label="使用情境照" hint="產品頁「適用時機」區塊左側的照片。">
                <ImageField
                  presetKey="photo-4x3"
                  mediaId={draft.useCaseImageMediaId}
                  url={draft.useCaseImageMediaId ? urls[draft.useCaseImageMediaId] : null}
                  onChange={(media) => {
                    remember(media);
                    patch({ useCaseImageMediaId: media?.id ?? null });
                  }}
                />
              </Field>

              <MultiSelect
                label="適用部位"
                options={taxonomy.data?.bodyParts ?? []}
                selected={draft.bodyPartIds}
                onChange={(bodyPartIds) => patch({ bodyPartIds })}
                keyOf={(b) => b.id}
                labelOf={(b) => b.nameZhTw || b.nameEn}
                hint="影響應用方案頁的推薦產品與產品列表的部位篩選。"
              />

              <MultiSelect
                label="認證"
                options={taxonomy.data?.certifications ?? []}
                selected={draft.certificationIds}
                onChange={(certificationIds) => patch({ certificationIds })}
                keyOf={(c) => c.id}
                labelOf={(c) => c.mark}
              />
            </div>
          </div>

          <div className="panel">
            <LocaleTabs active={locale} onChange={setLocale} levels={levels} />

            <div className="panel-body">
              {hasTranslation && Object.keys(draft.translations).length > 1 && (
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ color: 'var(--red)' }}
                    onClick={() => {
                      // 只從畫面拿掉；真正的刪除靠送出時的 null（見 removed 的說明）
                      const next = { ...draft.translations };
                      delete next[locale];
                      setDraft({ ...draft, translations: next });
                      setRemoved((r) => [...new Set([...r, locale])]);
                      setLocale(LOCALES.find((l) => l !== locale) ?? locale);
                    }}
                  >
                    移除此語系的翻譯
                  </button>
                </div>
              )}

              {!hasTranslation && (
                <p className="form-hint mb-4">
                  這個語系還沒有翻譯。填入名稱並儲存後，前台的該語系才會出現這筆產品。
                </p>
              )}

              <Field label="名稱" required hint="沒有名稱的語系，該產品在前台完全不會出現。">
                <input
                  className="form-control"
                  value={tr.name ?? ''}
                  onChange={(e) => patchTr({ name: e.target.value })}
                />
              </Field>

              <Field label="摘要" hint="列表卡與產品頁上方的一段話。">
                <textarea
                  className="form-control"
                  rows={3}
                  value={tr.summary ?? ''}
                  onChange={(e) => patchTr({ summary: e.target.value })}
                />
              </Field>

              <Field label="首頁精選文案" hint="只有勾選精選時會用到。">
                <input
                  className="form-control"
                  value={tr.featuredBlurb ?? ''}
                  onChange={(e) => patchTr({ featuredBlurb: e.target.value })}
                />
              </Field>

              <Repeater
                label="產品特色"
                items={tr.features ?? []}
                onChange={(features) => patchTr({ features })}
                create={() => ({ title: '', body: '' })}
                min={2}
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
                label="適用時機"
                items={tr.useCases ?? []}
                onChange={(useCases) => patchTr({ useCases })}
                create={() => ({ title: '', body: '' })}
                min={2}
                max={5}
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
                label="規格"
                items={tr.specs ?? []}
                onChange={(specs) => patchTr({ specs })}
                create={() => ({ label: '', value: '' })}
                max={12}
                renderItem={(item, update) => (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="form-control"
                      placeholder="項目（如 材質）"
                      value={item.label ?? ''}
                      onChange={(e) => update({ label: e.target.value })}
                    />
                    <input
                      className="form-control"
                      placeholder="內容"
                      value={item.value ?? ''}
                      onChange={(e) => update({ value: e.target.value })}
                    />
                  </div>
                )}
              />

              <SizeChartEditor
                value={tr.sizeChart}
                onChange={(sizeChart) => patchTr({ sizeChart })}
              />

              <Field label="SEO 標題">
                <input
                  className="form-control"
                  value={tr.seoTitle ?? ''}
                  onChange={(e) => patchTr({ seoTitle: e.target.value })}
                />
              </Field>

              <Field label="SEO 敘述">
                <textarea
                  className="form-control"
                  rows={2}
                  value={tr.seoDescription ?? ''}
                  onChange={(e) => patchTr({ seoDescription: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>

        <aside className="panel lg:sticky lg:top-[calc(var(--app-header-height)+1.25rem)]">
          <div className="panel-header">
            <h2 className="text-[0.95rem] font-semibold">狀態</h2>
            <StatusTag
              status={draft.status}
              scheduled={
                draft.status === 1 &&
                draft.publishedAt !== null &&
                new Date(draft.publishedAt) > new Date()
              }
            />
          </div>

          <div className="panel-body">
            {/* 發布是獨立動作而非存檔的一部分 —— Author 可存草稿但不可發布，
                混在一起的話他每次存檔都會撞 403 */}
            {draft.status === 1 ? (
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

            <dl className="mt-4 space-y-2 text-[0.82rem]">
              <Meta label="最後更新" value={formatDateTime(draft.updatedAt)} />
              <Meta label="首次發布" value={draft.publishedAt ? formatDateTime(draft.publishedAt) : '—'} />
              <Meta label="圖片" value={`${draft.images.length} 張`} />
              <Meta label="適用部位" value={`${draft.bodyPartIds.length} 項`} />
              <Meta label="認證" value={`${draft.certificationIds.length} 項`} />
            </dl>

            <button
              type="button"
              className="btn btn-ghost btn-block mt-4"
              style={{ color: 'var(--red)' }}
              onClick={() => navigate('/products')}
            >
              放棄變更
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

/**
 * 送出的 payload。
 *
 * <p>
 * ⚠️ **後端的 null 代表「這次不動它」、空陣列代表「清空」**
 * （`UpsertProductRequest`）。這裡整份送出是安全的，因為畫面本來就載入了完整資料；
 * 但**不可以把沒編輯到的欄位省略成 null 再送** —— 那會變成「不動它」，
 * 使用者刻意清空的內容就存不進去。
 * </p>
 */
function toRequest(draft: AdminProduct, removed: string[]) {
  return {
    slug: draft.slug,
    sku: draft.sku,
    categoryId: draft.categoryId,
    subCategoryId: draft.subCategoryId,
    collectionId: draft.collectionId,
    isFeatured: draft.isFeatured,
    featuredSortOrder: draft.featuredSortOrder,
    sortOrder: draft.sortOrder,
    images: draft.images,
    bodyPartIds: draft.bodyPartIds,
    certificationIds: draft.certificationIds,
    useCaseImageMediaId: draft.useCaseImageMediaId,
    clearUseCaseImage: draft.useCaseImageMediaId === null,
    // 被移除的語系要明確送 null —— 少了這一步，「沒提到」在後端是「不動它」，
    // 使用者按了移除卻刪不掉，而且畫面上已經不見了，下次重整才會發現還在
    translations: {
      ...draft.translations,
      ...Object.fromEntries(removed.map((l) => [l, null])),
    },
    rowVersion: draft.rowVersion,
    // 可為 null 的 FK 要用明確旗標表達清空 —— null 已經被「不動它」佔用了
    clearSubCategory: draft.subCategoryId === null,
    clearCollection: draft.collectionId === null,
  };
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  );
}

function formatDateTime(iso: string): string {
  // API 回的是 UTC（不帶 Z 的 datetime2，見 apps/web/lib/date.ts 的說明）——
  // 後台是給台灣的團隊看的，補上 Z 再交給瀏覽器換成當地時間
  const utc = iso.endsWith('Z') ? iso : `${iso}Z`;
  return new Date(utc).toLocaleString('zh-TW', { hour12: false });
}
