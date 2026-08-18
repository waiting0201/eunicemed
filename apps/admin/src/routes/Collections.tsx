import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type AdminCollection } from "@/lib/api";
import { DataTable, ListPage } from "@/components/ListPage";
import { Dialog, DialogActions } from "@/components/Dialog";
import { Field } from "@/components/form/Field";
import { TranslationTabs } from "@/components/TranslationTabs";
import { LocaleGauges } from "@/components/Gauge";
import { describeLevel, levelOf } from "@/lib/completeness";
import type { Locale } from "@/components/LocaleTabs";

/**
 * 系列（Care · Protect · Advance）。
 *
 * <p>
 * 三筆固定 —— 它們是品牌的支撐強度分級，不是可增減的內容
 * （產品的色標、應用方案的支撐等級區塊都綁在這三個 slug 上）。
 * </p>
 */
const STRENGTH = ["—", "輕度", "中度", "高度"];

export function Collections() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminCollection | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.collections(),
  });

  return (
    <ListPage
      eyebrow="分類"
      title="系列"
      summary={
        data && (
          <span
            className="text-[0.85rem]"
            style={{ color: "var(--text-secondary)" }}
          >
            共 <span className="mono">{data.length}</span> 個
          </span>
        )
      }
    >
      <p className="form-hint mb-3">
        系列是產品的支撐強度分級，全站共用同一組（產品色標、應用方案的支撐等級區塊都綁在這裡）。
      </p>

      <DataTable
        columns={5}
        isPending={isPending}
        error={error}
        isEmpty={data?.length === 0}
        emptyText="還沒有系列。"
        head={
          <tr>
            <th>名稱</th>
            <th className="w-28">網址代稱</th>
            <th className="w-24">強度</th>
            <th className="w-36">內容完整度</th>
            <th className="w-20" />
          </tr>
        }
      >
        {data?.map((c) => (
          <tr key={c.id}>
            <td className="max-w-0">
              <span className="block truncate font-medium">
                {c.translations["zh-TW"]?.name ??
                  c.translations.en?.name ??
                  c.slug}
              </span>
            </td>
            <td className="max-w-0">
              <span className="mono block truncate">{c.slug}</span>
            </td>
            <td>{STRENGTH[c.strength] ?? c.strength}</td>
            <td>
              <LocaleGauges
                levels={{
                  en: levelOf([
                    Boolean(c.translations.en?.name),
                    Boolean(c.translations.en?.description),
                    Boolean(c.translations.en?.description),
                  ]),
                  "zh-TW": levelOf([
                    Boolean(c.translations["zh-TW"]?.name),
                    Boolean(c.translations["zh-TW"]?.description),
                    Boolean(c.translations["zh-TW"]?.description),
                  ]),
                }}
                labelOf={describeLevel}
                animateKey={c.id}
              />
            </td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setEditing(c)}
              >
                編輯
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {editing && (
        <CollectionDialog
          collection={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
            setEditing(null);
          }}
        />
      )}
    </ListPage>
  );
}

function CollectionDialog({
  collection,
  onClose,
  onSaved,
}: {
  collection: AdminCollection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [translations, setTranslations] = useState<
    Record<string, { name: string; description?: string | null } | null>
  >({ ...collection.translations });
  const [sortOrder, setSortOrder] = useState(collection.sortOrder);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api.saveCollection(collection.id, {
        sortOrder,
        strength: collection.strength,
        translations,
      }),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : "儲存失敗。"),
  });

  const patch = (
    locale: Locale,
    p: Partial<{ name: string; description: string }>,
  ) =>
    setTranslations((t) => ({
      ...t,
      [locale]: { name: "", ...(t[locale] ?? {}), ...p },
    }));

  return (
    <Dialog
      title={
        <>
          編輯系列 <span className="mono">{collection.slug}</span>
        </>
      }
      width="36rem"
      onClose={onClose}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          onSave={() => save.mutate()}
        />
      }
    >
      <Field label="排序">
        <input
          type="number"
          className="form-control mono w-32"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </Field>

      <TranslationTabs
        translations={translations}
        hasContent={(v) => Boolean(v?.name?.trim())}
        onRemove={(locale) =>
          setTranslations((t) => ({ ...t, [locale]: null }))
        }
      >
        {(locale) => {
          const tr = translations[locale] ?? { name: "" };
          return (
            <>
              <Field label="名稱" required>
                <input
                  className="form-control"
                  value={tr.name ?? ""}
                  onChange={(e) => patch(locale, { name: e.target.value })}
                />
              </Field>
              <Field label="說明">
                <textarea
                  className="form-control"
                  rows={3}
                  value={tr.description ?? ""}
                  onChange={(e) =>
                    patch(locale, { description: e.target.value })
                  }
                />
              </Field>
            </>
          );
        }}
      </TranslationTabs>
    </Dialog>
  );
}
