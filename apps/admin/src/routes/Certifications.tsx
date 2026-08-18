import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type AdminCertification } from "@/lib/api";
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
 * 認證。**About 的認證帶與產品頁的標章列共用同一份**（docs/05 §3.3）——
 * 改一次兩邊都變，這在畫面上要講出來。
 */
export function Certifications() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminCertification | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["certifications"],
    queryFn: () => api.certifications(),
  });

  return (
    <ListPage
      eyebrow="分類"
      title="認證"
      summary={
        data && (
          <span
            className="text-[0.85rem]"
            style={{ color: "var(--text-secondary)" }}
          >
            共 <span className="mono">{data.length}</span> 項
          </span>
        )
      }
    >
      <p className="form-hint mb-3">
        About 頁的認證帶與產品頁的標章列共用這一份 —— 改一次兩邊都會變。
        標章文字（如 ISO 13485）是品牌符號，不翻譯。
      </p>

      <DataTable
        columns={5}
        isPending={isPending}
        error={error}
        isEmpty={data?.length === 0}
        emptyText="還沒有認證。"
        head={
          <tr>
            <th className="w-32">標章</th>
            <th>說明</th>
            <th className="w-24">掛載產品</th>
            <th className="w-36">內容完整度</th>
            <th className="w-20" />
          </tr>
        }
      >
        {data?.map((c) => (
          <tr key={c.id}>
            <td>
              <span className="font-medium">{c.mark}</span>
              <span
                className="mono block text-[0.75rem]"
                style={{ color: "var(--text-muted)" }}
              >
                {c.slug}
              </span>
            </td>
            <td className="max-w-0">
              <span className="block truncate text-[0.88rem]">
                {c.translations["zh-TW"]?.subLabel ??
                  c.translations.en?.subLabel ??
                  "—"}
              </span>
            </td>
            <td>
              <span className="mono">{c.productCount}</span>
            </td>
            <td>
              <LocaleGauges
                levels={certLevels(c)}
                labelOf={describeLevel}
                animateKey={c.id}
              />
            </td>
            <td>
              <span className="flex items-center gap-2">
                <StatusTag status={c.status} />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setEditing(c)}
                >
                  編輯
                </button>
              </span>
            </td>
          </tr>
        ))}
      </DataTable>

      {editing && (
        <CertificationDialog
          certification={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["certifications"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
            setEditing(null);
          }}
        />
      )}
    </ListPage>
  );
}

function CertificationDialog({
  certification,
  onClose,
  onSaved,
}: {
  certification: AdminCertification;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mark, setMark] = useState(certification.mark);
  const [sortOrder, setSortOrder] = useState(certification.sortOrder);
  const [logoMediaId, setLogoMediaId] = useState(certification.logoMediaId);
  const [status, setStatus] = useState(certification.status);
  const [translations, setTranslations] = useState<
    Record<
      string,
      { subLabel?: string | null; description?: string | null } | null
    >
  >({ ...certification.translations });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const mediaUrls = useQuery({
    queryKey: ["media-all"],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  const all = { ...(mediaUrls.data ?? {}), ...urls };

  const save = useMutation({
    mutationFn: () =>
      api.saveCertification(certification.id, {
        mark,
        sortOrder,
        logoMediaId,
        status,
        clearLogo: logoMediaId === null,
        translations,
      }),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : "儲存失敗。"),
  });

  const patch = (
    locale: Locale,
    p: Partial<{ subLabel: string; description: string }>,
  ) =>
    setTranslations((t) => ({
      ...t,
      [locale]: { ...(t[locale] ?? {}), ...p },
    }));

  return (
    <Dialog
      title="編輯認證"
      onClose={onClose}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          disabled={!mark.trim()}
          onSave={() => save.mutate()}
        />
      }
    >
      <FieldRow>
        <Field
          label="標章文字"
          required
          hint="品牌符號，兩種語系都顯示同一個（如 ISO 13485）。"
        >
          <input
            className="form-control"
            value={mark}
            onChange={(e) => setMark(e.target.value)}
          />
        </Field>
        <Field label="排序">
          <input
            type="number"
            className="form-control mono"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </Field>
      </FieldRow>

      <Field
        label="狀態"
        hint="草稿或封存會同時從 About 認證帶與產品標章列消失。"
      >
        <StatusSelect value={status} onChange={setStatus} />
      </Field>

      <Field label="標章圖" hint="留空時前台以標章文字呈現。">
        <ImageField
          presetKey="logo-mark"
          mediaId={logoMediaId}
          url={logoMediaId ? all[logoMediaId] : null}
          onChange={(m) => {
            if (m) setUrls((u) => ({ ...u, [m.id]: m.url }));
            setLogoMediaId(m?.id ?? null);
          }}
        />
      </Field>

      <TranslationTabs
        translations={translations}
        hasContent={(v) =>
          Boolean(v?.subLabel?.trim() || v?.description?.trim())
        }
        onRemove={(locale) =>
          setTranslations((t) => ({ ...t, [locale]: null }))
        }
      >
        {(locale) => {
          const tr = translations[locale] ?? {};
          return (
            <>
              <Field
                label="下方小字"
                hint="標章底下那一行，如「品質管理系統」。"
              >
                <input
                  className="form-control"
                  value={tr.subLabel ?? ""}
                  onChange={(e) => patch(locale, { subLabel: e.target.value })}
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

function certLevels(c: AdminCertification) {
  const of = (locale: string) =>
    levelOf([
      Boolean(c.translations[locale]?.subLabel),
      Boolean(c.translations[locale]?.description),
      Boolean(c.translations[locale]?.description),
    ]);
  return { en: of("en"), "zh-TW": of("zh-TW") };
}
