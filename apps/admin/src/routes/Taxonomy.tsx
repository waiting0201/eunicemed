import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ApiError,
  type AdminCategory,
  type AdminSubCategory,
  type TaxonomyTranslation,
} from "@/lib/api";
import { DataTable, ListPage } from "@/components/ListPage";
import { Dialog, DialogActions } from "@/components/Dialog";
import { Field, FieldRow } from "@/components/form/Field";
import { ImageField } from "@/components/MediaPicker";
import { TranslationTabs } from "@/components/TranslationTabs";
import { LocaleGauges } from "@/components/Gauge";
import { StatusTag } from "@/components/StatusTag";
import { StatusSelect } from "@/components/StatusSelect";
import { describeLevel, levelOf } from "@/lib/completeness";
import type { Locale } from "@/components/LocaleTabs";

/**
 * 分類與子分類。**同一個畫面** —— 子分類的意義完全依附於它的分類
 * （URL 是 `/products/{category}/{sub}`），分開兩頁看會一直來回切。
 *
 * <p>
 * 不提供新增／刪除：三個分類與 17 個子分類是網站的骨架，
 * 動它們等於改全站 URL 結構（後端也擋 —— 有產品引用時回 409）。
 * 要增刪請走開發流程。
 * </p>
 */
type Draft = {
  slug: string;
  sortOrder: number;
  imageMediaId: string | null;
  heroImageMediaId: string | null;
  translations: Record<string, TaxonomyTranslation | null>;
  /** 只有子分類有；分類永遠是可見的 */
  status: number | null;
  rowVersion: string | null;
};

export function Taxonomy() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<
    | { kind: "category"; row: AdminCategory }
    | { kind: "sub"; row: AdminSubCategory }
    | null
  >(null);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories(),
  });
  const subs = useQuery({
    queryKey: ["sub-categories"],
    queryFn: () => api.subCategories(),
  });

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["sub-categories"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    setEditing(null);
  };

  return (
    <ListPage
      eyebrow="分類"
      title="分類與子分類"
      summary={
        categories.data && (
          <span
            className="text-[0.85rem]"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="mono">{categories.data.length}</span> 個分類 ·{" "}
            <span className="mono">{subs.data?.length ?? 0}</span> 個子分類
          </span>
        )
      }
    >
      <p className="form-hint mb-3">
        分類與子分類決定產品網址（
        <span className="mono">/products/分類/子分類/產品</span>）。
        改動網址代稱會讓舊網址失效 —— 記得到「轉址」補一條規則。
      </p>

      <DataTable
        columns={5}
        isPending={categories.isPending || subs.isPending}
        error={categories.error ?? subs.error}
        isEmpty={categories.data?.length === 0}
        emptyText="還沒有分類。"
        head={
          <tr>
            <th>名稱</th>
            <th className="w-28">網址代稱</th>
            <th className="w-24">產品數</th>
            <th className="w-36">內容完整度</th>
            <th className="w-20" />
          </tr>
        }
      >
        {categories.data?.flatMap((category) => [
          <tr key={category.id}>
            <td className="max-w-0">
              <span className="block truncate font-medium">
                {category.translations["zh-TW"]?.name ??
                  category.translations.en?.name ??
                  category.slug}
              </span>
            </td>
            <td className="max-w-0">
              <span className="mono block truncate">{category.slug}</span>
            </td>
            <td>
              <span className="mono">{category.productCount}</span>
            </td>
            <td>
              <LocaleGauges
                levels={taxonomyLevels(category.translations)}
                labelOf={describeLevel}
                animateKey={category.id}
              />
            </td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setEditing({ kind: "category", row: category })}
              >
                編輯
              </button>
            </td>
          </tr>,
          ...(subs.data ?? [])
            .filter((s) => s.categoryId === category.id)
            .map((sub) => (
              <tr key={sub.id}>
                <td className="max-w-0 pl-8">
                  <span
                    className="block truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    ↳{" "}
                    {sub.translations["zh-TW"]?.name ??
                      sub.translations.en?.name ??
                      sub.slug}
                  </span>
                </td>
                <td className="max-w-0">
                  <span
                    className="mono block truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {sub.slug}
                  </span>
                </td>
                <td>
                  <span className="mono">{sub.productCount}</span>
                </td>
                <td>
                  <LocaleGauges
                    levels={taxonomyLevels(sub.translations)}
                    labelOf={describeLevel}
                    animateKey={sub.id}
                  />
                </td>
                <td>
                  <span className="flex items-center gap-2">
                    {sub.status !== 1 && <StatusTag status={sub.status} />}
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEditing({ kind: "sub", row: sub })}
                    >
                      編輯
                    </button>
                  </span>
                </td>
              </tr>
            )),
        ])}
      </DataTable>

      {editing && (
        <TaxonomyDialog
          kind={editing.kind}
          row={editing.row}
          onClose={() => setEditing(null)}
          onSaved={done}
        />
      )}
    </ListPage>
  );
}

function TaxonomyDialog({
  kind,
  row,
  onClose,
  onSaved,
}: {
  kind: "category" | "sub";
  row: AdminCategory | AdminSubCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    slug: row.slug,
    sortOrder: row.sortOrder,
    imageMediaId: row.imageMediaId,
    heroImageMediaId: row.heroImageMediaId,
    translations: { ...row.translations },
    status: "status" in row ? row.status : null,
    rowVersion: row.rowVersion,
  });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const mediaUrls = useQuery({
    queryKey: ["media-all"],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  const all = { ...(mediaUrls.data ?? {}), ...urls };

  const save = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const body = {
        slug: draft.slug,
        sortOrder: draft.sortOrder,
        imageMediaId: draft.imageMediaId,
        heroImageMediaId: draft.heroImageMediaId,
        // 可為 null 的媒體欄位要用明確旗標清空 —— null 已被「不動它」佔用
        clearImage: draft.imageMediaId === null,
        clearHeroImage: draft.heroImageMediaId === null,
        translations: draft.translations,
        ...(draft.status !== null && { status: draft.status }),
        rowVersion: draft.rowVersion,
      };
      return kind === "category"
        ? api.saveCategory(row.id, body)
        : api.saveSubCategory(row.id, body);
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : "儲存失敗。"),
  });

  const patchTr = (locale: Locale, patch: Partial<TaxonomyTranslation>) =>
    setDraft((d) => ({
      ...d,
      translations: {
        ...d.translations,
        [locale]: { ...(d.translations[locale] ?? {}), ...patch },
      },
    }));

  const isSub = kind === "sub";

  return (
    <Dialog
      title={`編輯${isSub ? "子分類" : "分類"}`}
      width="44rem"
      onClose={onClose}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          onSave={() => save.mutate()}
        />
      }
    >
      <FieldRow>
        <Field
          label="網址代稱"
          required
          hint={
            isSub
              ? "全站唯一（不只分類內唯一）。改了會讓底下所有產品的網址失效。"
              : "改了會讓這個分類底下所有產品的網址失效。"
          }
        >
          <input
            className="form-control mono"
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          />
        </Field>
        <Field label="排序">
          <input
            type="number"
            className="form-control mono"
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value) })
            }
          />
        </Field>
      </FieldRow>

      {isSub && draft.status !== null && (
        <Field
          label="狀態"
          hint="草稿或封存的子分類，連同它的落地頁一起從前台與 sitemap 消失。"
        >
          <StatusSelect
            value={draft.status}
            onChange={(s) => setDraft({ ...draft, status: s })}
          />
        </Field>
      )}

      <FieldRow>
        <Field label="卡片圖">
          <ImageField
            presetKey="square"
            mediaId={draft.imageMediaId}
            url={draft.imageMediaId ? all[draft.imageMediaId] : null}
            onChange={(m) => {
              if (m) setUrls((u) => ({ ...u, [m.id]: m.url }));
              setDraft({ ...draft, imageMediaId: m?.id ?? null });
            }}
          />
        </Field>
        <Field label="頁首大圖">
          <ImageField
            presetKey="wide-16x10"
            mediaId={draft.heroImageMediaId}
            url={draft.heroImageMediaId ? all[draft.heroImageMediaId] : null}
            onChange={(m) => {
              if (m) setUrls((u) => ({ ...u, [m.id]: m.url }));
              setDraft({ ...draft, heroImageMediaId: m?.id ?? null });
            }}
          />
        </Field>
      </FieldRow>

      <TranslationTabs
        translations={draft.translations}
        hasContent={(v) => Boolean(v?.name?.trim())}
        onRemove={(locale) =>
          // null = 刪除該語系（後端慣例）
          setDraft((d) => ({
            ...d,
            translations: { ...d.translations, [locale]: null },
          }))
        }
      >
        {(locale) => {
          const tr = draft.translations[locale] ?? {};
          return (
            <>
              <Field label="名稱" required>
                <input
                  className="form-control"
                  value={tr.name ?? ""}
                  onChange={(e) => patchTr(locale, { name: e.target.value })}
                />
              </Field>
              <Field
                label="敘述"
                hint={
                  isSub
                    ? "子分類有獨立網址，這段是它的 SEO 內容 —— 缺了會是一頁薄內容。"
                    : undefined
                }
              >
                <textarea
                  className="form-control"
                  rows={3}
                  value={tr.description ?? ""}
                  onChange={(e) =>
                    patchTr(locale, { description: e.target.value })
                  }
                />
              </Field>
              <FieldRow>
                <Field label="SEO 標題">
                  <input
                    className="form-control"
                    value={tr.seoTitle ?? ""}
                    onChange={(e) =>
                      patchTr(locale, { seoTitle: e.target.value })
                    }
                  />
                </Field>
                <Field label="SEO 敘述">
                  <input
                    className="form-control"
                    value={tr.seoDescription ?? ""}
                    onChange={(e) =>
                      patchTr(locale, { seoDescription: e.target.value })
                    }
                  />
                </Field>
              </FieldRow>
            </>
          );
        }}
      </TranslationTabs>
    </Dialog>
  );
}

function taxonomyLevels(translations: Record<string, TaxonomyTranslation>) {
  return {
    en: levelOf([
      Boolean(translations.en?.name),
      Boolean(translations.en?.description),
      Boolean(translations.en?.seoTitle && translations.en?.seoDescription),
    ]),
    "zh-TW": levelOf([
      Boolean(translations["zh-TW"]?.name),
      Boolean(translations["zh-TW"]?.description),
      Boolean(
        translations["zh-TW"]?.seoTitle &&
        translations["zh-TW"]?.seoDescription,
      ),
    ]),
  };
}
