import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError, type AdminCertification } from "@/lib/api";
import { Dialog, DialogActions } from "@/components/Dialog";
import { Field, FieldRow } from "@/components/form/Field";
import { ImageField } from "@/components/MediaField";
import { TranslationTabs } from "@/components/TranslationTabs";
import { StatusSelect } from "@/components/StatusSelect";
import type { Locale } from "@/components/LocaleTabs";

/**
 * 認證的編輯視窗。
 *
 * <p>
 * **沒有獨立的「認證」畫面** —— 認證的內容在它露出的地方就地維護：
 * 頁面內容 → 關於我們 → 05 認證。獨立畫面等於要編輯者記得
 * 「標章文字在另一個選單裡改」，那是資料表的分法，不是工作的分法。
 * </p>
 */
export function CertificationDialog({
  certification,
  onClose,
  onSaved,
}: {
  /** `null` 代表新增一筆。 */
  certification: AdminCertification | null;
  onClose: () => void;
  onSaved: (saved: AdminCertification) => void;
}) {
  const isNew = certification === null;

  const [mark, setMark] = useState(certification?.mark ?? "");
  const [slug, setSlug] = useState(certification?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(certification?.sortOrder ?? 0);
  const [logoMediaId, setLogoMediaId] = useState(
    certification?.logoMediaId ?? null,
  );
  const [status, setStatus] = useState(certification?.status ?? 1);
  const [translations, setTranslations] = useState<
    Record<
      string,
      { subLabel?: string | null; description?: string | null } | null
    >
  >({ ...(certification?.translations ?? {}) });
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
    mutationFn: () => {
      const body = {
        mark,
        slug,
        sortOrder,
        logoMediaId,
        status,
        clearLogo: logoMediaId === null,
        translations,
      };
      return isNew
        ? api.createCertification(body)
        : api.saveCertification(certification.id, body);
    },
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
      title={isNew ? "新增認證" : "編輯認證"}
      onClose={onClose}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          disabled={!mark.trim() || !slug.trim()}
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
        <Field
          label="網址代稱"
          required
          hint="區段引用時存的就是它。建立後不要隨意更動。"
        >
          <input
            className="form-control mono"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>
      </FieldRow>

      <Field label="排序">
        <input
          type="number"
          className="form-control mono"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </Field>

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
