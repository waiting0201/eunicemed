import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  ApiError,
  type AdminArticle,
  type ArticleTranslation,
  type NewsEventTranslation,
} from '@/lib/api';
import { Field, FieldRow } from '@/components/form/Field';
import { RichText } from '@/components/form/RichText';
import { MultiSelect } from '@/components/form/MultiSelect';
import { ImageField, ImageList } from '@/components/MediaField';
import { LocaleTabs, LOCALES, type Locale } from '@/components/LocaleTabs';
import { StatusTag } from '@/components/StatusTag';
import { Icon } from '@/components/Icon';
import { levelOf } from '@/lib/completeness';
import type { GaugeLevel } from '@/components/Gauge';
import { formatDateTime } from '@/lib/format';

/**
 * 文章編輯（News 與 Insights 共用）。骨架沿用產品編輯頁。
 *
 * <p>
 * 兩者只差在 <c>type</c>，但差別在畫面上要看得出來：**只有 News 有活動面板與圖庫**
 * （Insights 的 `event` / `gallery` 在公開端點恆為 null）。
 * 對 Insights 顯示那兩個面板，編輯者填了會是靜默的無效操作。
 * </p>
 *
 * <p>
 * **排程發布**：`publishedAt` 填未來時間再按發布，文章就會等到那個時間才出現在前台
 * （公開端點對未來時間一律查不到）。這是本站唯一的排程機制，沒有排程器 ——
 * 所以那個欄位一定要在畫面上，而且要講清楚它會做什麼。
 * </p>
 */
const TYPE_LABEL: Record<number, string> = { 1: 'News', 2: 'Insights' };

export function ArticleEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [locale, setLocale] = useState<Locale>('en');
  const [draft, setDraft] = useState<AdminArticle | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pickedUrls, setPickedUrls] = useState<Record<string, string>>({});

  const { data, isPending } = useQuery({
    queryKey: ['article', id],
    queryFn: () => api.article(id!),
    enabled: Boolean(id) && !isNew,
  });

  const categories = useQuery({
    queryKey: ['article-categories'],
    queryFn: () => api.articleCategories(),
    staleTime: 5 * 60_000,
  });

  const tags = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags(),
    staleTime: 5 * 60_000,
  });

  const mediaUrls = useQuery({
    queryKey: ['media-all'],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  useEffect(() => {
    if (isNew) {
      setDraft(blankArticle());
      return;
    }
    if (data) {
      setDraft(data);
      setRemoved([]);
    }
  }, [data, isNew]);

  const save = useMutation({
    mutationFn: async (body: unknown) =>
      isNew ? api.createArticle(body) : api.saveArticle(id!, body),
    onSuccess: (result) => {
      setError(null);
      setErrors([]);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });

      if (isNew) {
        // 活動面板與圖庫都要有 id 才能存 —— 建立後直接進編輯頁，不留在建立頁
        navigate(`/articles/${result.id}`, { replace: true });
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
      next === 'publish' ? api.publishArticle(id!) : api.unpublishArticle(id!),
    onSuccess: (result) => {
      setDraft(result);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : '操作失敗。'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteArticle(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      navigate('/articles');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : '刪除失敗。'),
  });

  if ((isPending && !isNew) || !draft) {
    return <p style={{ color: 'var(--text-muted)' }}>載入中…</p>;
  }

  const isNews = draft.type === 1;
  const tr: ArticleTranslation = draft.translations[locale] ?? { title: '' };
  const hasTranslation = locale in draft.translations;

  const patch = (next: Partial<AdminArticle>) => setDraft({ ...draft, ...next });
  const patchTr = (next: Partial<ArticleTranslation>) =>
    setDraft({
      ...draft,
      translations: { ...draft.translations, [locale]: { ...tr, ...next } },
    });

  const urls = { ...(mediaUrls.data ?? {}), ...pickedUrls };
  const levels = Object.fromEntries(
    LOCALES.map((l) => [l, articleLevel(draft.translations[l])]),
  ) as Record<string, GaugeLevel>;

  // 分類的 kind 必須等於文章的 type —— 掛錯的話後端會擋，但這裡先不讓他選
  const usable = (categories.data ?? []).filter((c) => c.kind === draft.type);

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/articles" className="eyebrow inline-flex items-center gap-1">
            <Icon name="back" className="icon icon-sm" />
            文章
          </Link>
          <h1 className="page-title truncate">
            {draft.translations.en?.title ??
              draft.translations['zh-TW']?.title ??
              (isNew ? '新文章' : '（未命名）')}
          </h1>
          <p className="mono text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>
            {TYPE_LABEL[draft.type]} · {draft.slug || '（尚未設定網址代稱）'}
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
            disabled={save.isPending || !draft.slug.trim()}
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
                <Field label="型態" required hint="News 有活動面板與圖庫，Insights 沒有。">
                  <select
                    className="form-control"
                    value={draft.type}
                    disabled={!isNew}
                    onChange={(e) =>
                      // 換型態會讓現有分類與新 kind 不符，一併清掉
                      patch({ type: Number(e.target.value), categoryId: null })
                    }
                  >
                    <option value={1}>News</option>
                    <option value={2}>Insights</option>
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
                <Field label="分類">
                  <select
                    className="form-control"
                    value={draft.categoryId ?? ''}
                    onChange={(e) => patch({ categoryId: e.target.value || null })}
                  >
                    <option value="">（不指定）</option>
                    {usable.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.translations['zh-TW']?.name ?? c.translations.en?.name ?? c.slug}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="閱讀時間（分鐘）" hint="留空的話前台不顯示這一行。">
                  <input
                    type="number"
                    className="form-control mono"
                    value={draft.readMinutes ?? ''}
                    onChange={(e) =>
                      patch({
                        readMinutes: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Field>
              </FieldRow>

              <Field label="封面圖" hint="列表卡與詳情頁頂部共用這一張。">
                <ImageField
                  presetKey="content-16x9"
                  mediaId={draft.coverMediaId}
                  url={draft.coverMediaId ? urls[draft.coverMediaId] : null}
                  onChange={(media) => {
                    if (media) setPickedUrls((u) => ({ ...u, [media.id]: media.url }));
                    patch({ coverMediaId: media?.id ?? null });
                  }}
                />
              </Field>

              <MultiSelect
                label="標籤"
                options={tags.data ?? []}
                selected={draft.tagIds}
                onChange={(tagIds) => patch({ tagIds })}
                keyOf={(t) => t.id}
                labelOf={(t) => t.nameZhTw ?? t.nameEn}
                hint="標籤是前台的篩選按鈕。沒有中文名稱的標籤在中文站顯示英文名。"
              />

              <label className="flex items-center gap-2 text-[0.9rem]">
                <input
                  type="checkbox"
                  checked={draft.isFeatured}
                  onChange={(e) => patch({ isFeatured: e.target.checked })}
                />
                精選（列表頁置頂）
              </label>
            </div>
          </div>

          {isNews &&
            (isNew ? (
              <div className="panel mb-5">
                <div className="panel-body">
                  <p className="form-hint">
                    活動資訊與圖庫要等文章建立之後才能編輯 —— 它們是掛在文章 id 上的。
                  </p>
                </div>
              </div>
            ) : (
              <>
                <EventPanel articleId={id!} hasEvent={draft.hasEvent} locale={locale} />
                <GalleryPanel articleId={id!} urls={urls} />
              </>
            ))}

          <div className="panel mb-5">
            <div className="panel-header">
              <h2 className="text-[0.95rem] font-semibold">內容</h2>
              <LocaleTabs active={locale} onChange={setLocale} levels={levels} />
            </div>

            <div className="panel-body">
              {!hasTranslation && (
                <p className="form-hint mb-4">
                  這個語系還沒有內容。填了標題並儲存之後，這篇文章才會出現在該語系的前台。
                </p>
              )}

              <Field label="標題" required>
                <input
                  className="form-control"
                  value={tr.title}
                  onChange={(e) => patchTr({ title: e.target.value })}
                />
              </Field>

              <Field label="前言 standfirst" hint="標題底下那一段。列表卡沒有它時改用摘要。">
                <textarea
                  className="form-control"
                  rows={2}
                  value={tr.standfirst ?? ''}
                  onChange={(e) => patchTr({ standfirst: e.target.value })}
                />
              </Field>

              <Field
                label="內文"
                hint="目錄由內文的 H2 自動產生 —— 想讓某一段出現在目錄裡就把它設成 H2。"
              >
                <RichText
                  value={tr.body}
                  profile="article"
                  onChange={(body) => patchTr({ body })}
                />
              </Field>

              <FieldRow>
                <Field label="摘要" hint="列表卡的文字。留空時前台取內文開頭。">
                  <textarea
                    className="form-control"
                    rows={2}
                    value={tr.excerpt ?? ''}
                    onChange={(e) => patchTr({ excerpt: e.target.value })}
                  />
                </Field>
                <Field label="作者">
                  <input
                    className="form-control"
                    value={tr.authorName ?? ''}
                    onChange={(e) => patchTr({ authorName: e.target.value })}
                  />
                </Field>
              </FieldRow>

              <Field label="免責聲明" hint="醫療相關內容的提醒文字，顯示在內文最後。">
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
                    if (!confirm(`移除 ${locale} 的內容？儲存後這篇文章在該語系的前台會消失。`))
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
            <Field label="發布時間" hint="填未來時間再按發布，就會等到那個時間才出現在前台。">
              <input
                type="datetime-local"
                className="form-control mono"
                value={toLocalInput(draft.publishedAt)}
                onChange={(e) => patch({ publishedAt: fromLocalInput(e.target.value) })}
              />
            </Field>

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

            {!isNew && (
              <>
                <dl className="mt-4 space-y-2 text-[0.82rem]">
                  <Meta label="最後更新" value={formatDateTime(draft.updatedAt)} />
                  <Meta
                    label="發布時間"
                    value={draft.publishedAt ? formatDateTime(draft.publishedAt) : '—'}
                  />
                  <Meta label="標籤" value={`${draft.tagIds.length} 個`} />
                  {isNews && <Meta label="圖庫" value={`${draft.galleryCount} 張`} />}
                </dl>

                <button
                  type="button"
                  className="btn btn-ghost btn-block mt-4"
                  style={{ color: 'var(--red)' }}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm('刪除這篇文章？前台的網址會變成 404，記得到「轉址」補一條規則。'))
                      remove.mutate();
                  }}
                >
                  刪除文章
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

/**
 * News 的活動面板。與文章是共用主鍵的 1:1，**存檔走自己的端點** ——
 * 所以這裡有自己的儲存按鈕，不跟著上面那顆走。
 */
function EventPanel({
  articleId,
  hasEvent,
  locale,
}: {
  articleId: string;
  hasEvent: boolean;
  locale: Locale;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    startDate: string;
    endDate: string;
    contactEmail: string;
    ctaUrl: string;
    translations: Record<string, NewsEventTranslation>;
  } | null>(null);

  const { data } = useQuery({
    queryKey: ['article-event', articleId],
    // 沒有活動時端點回 404 —— 那不是錯誤，是「這篇文章沒有活動」
    queryFn: () => api.articleEvent(articleId).catch(() => null),
    enabled: hasEvent,
  });

  useEffect(() => {
    if (data) {
      setDraft({
        startDate: data.startDate ?? '',
        endDate: data.endDate ?? '',
        contactEmail: data.contactEmail ?? '',
        ctaUrl: data.ctaUrl ?? '',
        translations: { ...data.translations },
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.saveArticleEvent(articleId, {
        startDate: draft?.startDate || null,
        endDate: draft?.endDate || null,
        contactEmail: draft?.contactEmail || null,
        ctaUrl: draft?.ctaUrl || null,
        translations: draft?.translations ?? {},
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['article-event', articleId] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteArticleEvent(articleId),
    onSuccess: () => {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['article-event', articleId] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '移除失敗。'),
  });

  const tr = draft?.translations[locale] ?? {};
  const patchTr = (next: Partial<NewsEventTranslation>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            translations: { ...d.translations, [locale]: { ...tr, ...next } },
          }
        : d,
    );

  return (
    <div className="panel mb-5">
      <div className="panel-header">
        <h2 className="text-[0.95rem] font-semibold">活動資訊</h2>
        {draft ? (
          <span className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ color: 'var(--red)' }}
              disabled={remove.isPending}
              onClick={() => {
                if (confirm('移除活動資訊？文章本身不受影響。')) remove.mutate();
              }}
            >
              移除
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? '儲存中…' : '儲存活動'}
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() =>
              setDraft({
                startDate: '',
                endDate: '',
                contactEmail: '',
                ctaUrl: '',
                translations: {},
              })
            }
          >
            加入活動資訊
          </button>
        )}
      </div>

      {draft && (
        <div className="panel-body">
          <p className="form-hint mb-4">
            展會用的資訊面板，顯示在 News 詳情頁的側欄。日期只用來排序與顯示，不影響發布。
          </p>

          <FieldRow>
            <Field label="開始日期">
              <input
                type="date"
                className="form-control mono"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              />
            </Field>
            <Field label="結束日期">
              <input
                type="date"
                className="form-control mono"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="聯絡信箱">
              <input
                className="form-control mono"
                value={draft.contactEmail}
                onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
              />
            </Field>
            <Field label="行動按鈕連結">
              <input
                className="form-control mono"
                placeholder="https://"
                value={draft.ctaUrl}
                onChange={(e) => setDraft({ ...draft, ctaUrl: e.target.value })}
              />
            </Field>
          </FieldRow>

          {/* 這幾個欄位跟著上方的語系分頁走 —— 展期文字與攤位號在兩個語系寫法不同 */}
          <p className="form-label">{locale} 的文字</p>
          <FieldRow>
            <Field label="展期文字" hint="給人看的那一行，如 3–5 September 2026。">
              <input
                className="form-control"
                value={tr.datesLabel ?? ''}
                onChange={(e) => patchTr({ datesLabel: e.target.value })}
              />
            </Field>
            <Field label="場地">
              <input
                className="form-control"
                value={tr.venue ?? ''}
                onChange={(e) => patchTr({ venue: e.target.value })}
              />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="攤位">
              <input
                className="form-control"
                value={tr.booth ?? ''}
                onChange={(e) => patchTr({ booth: e.target.value })}
              />
            </Field>
            <Field label="行動按鈕文字">
              <input
                className="form-control"
                value={tr.ctaLabel ?? ''}
                onChange={(e) => patchTr({ ctaLabel: e.target.value })}
              />
            </Field>
          </FieldRow>

          {error && (
            <p role="alert" className="alert mt-3">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** News 的圖庫。順序即畫面順序，存檔走自己的端點。 */
function GalleryPanel({ articleId, urls }: { articleId: string; urls: Record<string, string> }) {
  const queryClient = useQueryClient();
  const [images, setImages] = useState<
    { mediaId: string; isPrimary: boolean; sortOrder: number }[]
  >([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['article-gallery', articleId],
    queryFn: () => api.articleGallery(articleId),
  });

  useEffect(() => {
    if (data) {
      setImages(
        data.map((i, n) => ({
          mediaId: i.mediaId,
          isPrimary: false,
          sortOrder: n,
        })),
      );
      setDirty(false);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.saveArticleGallery(
        articleId,
        images.map((i, n) => ({ mediaId: i.mediaId, sortOrder: n })),
      ),
    onSuccess: () => {
      setDirty(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      queryClient.invalidateQueries({
        queryKey: ['article-gallery', articleId],
      });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  return (
    <div className="panel mb-5">
      <div className="panel-header">
        <h2 className="text-[0.95rem] font-semibold">圖庫</h2>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? '儲存中…' : dirty ? '儲存圖庫' : '已是最新'}
        </button>
      </div>

      <div className="panel-body">
        <p className="form-hint mb-2">展會現場照，顯示在 News 詳情頁內文之後。順序即畫面順序。</p>

        <ImageList
          presetKey="content-16x9"
          images={images}
          urls={urls}
          showPrimary={false}
          onChange={(next) => {
            setImages(next);
            setDirty(true);
          }}
        />

        {error && (
          <p role="alert" className="alert mt-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function blankArticle(): AdminArticle {
  return {
    id: '',
    slug: '',
    type: 1,
    categoryId: null,
    coverMediaId: null,
    readMinutes: null,
    isFeatured: false,
    status: 0,
    publishedAt: null,
    tagIds: [],
    hasEvent: false,
    galleryCount: 0,
    translations: { en: { title: '' } },
    rowVersion: null,
    createdAt: '',
    updatedAt: '',
  };
}

function toRequest(draft: AdminArticle, removed: string[]) {
  return {
    slug: draft.slug.trim(),
    type: draft.type,
    categoryId: draft.categoryId,
    clearCategory: draft.categoryId === null,
    coverMediaId: draft.coverMediaId,
    clearCover: draft.coverMediaId === null,
    readMinutes: draft.readMinutes,
    isFeatured: draft.isFeatured,
    tagIds: draft.tagIds,
    publishedAt: draft.publishedAt,
    translations: {
      ...draft.translations,
      ...Object.fromEntries(removed.map((l) => [l, null])),
    },
    rowVersion: draft.rowVersion,
  };
}

/**
 * 三段：有標題 → 有內文 → SEO 齊全。
 * 與產品列表同一套語彙，掃視時不用切換心智模型。
 */
function articleLevel(tr?: ArticleTranslation): GaugeLevel {
  return levelOf([
    Boolean(tr?.title),
    Boolean(tr?.body),
    Boolean(tr?.seoTitle && tr?.seoDescription),
  ]);
}

/** `datetime-local` 要的是無時區的本地字串，而 API 回的是 ISO。 */
function toLocalInput(iso: string | null) {
  return iso ? iso.slice(0, 16) : '';
}

function fromLocalInput(value: string) {
  return value ? `${value}:00` : null;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  );
}
