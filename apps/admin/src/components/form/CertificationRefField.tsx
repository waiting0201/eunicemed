import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type AdminCertification } from '@/lib/api';
import { CertificationDialog } from '@/components/CertificationDialog';
import { StatusTag } from '@/components/StatusTag';
import { Icon } from '@/components/Icon';

/**
 * 區段裡的一則認證引用。
 *
 * <p>
 * **就地編輯，不跳頁。** 舊版這裡只有一個下拉選 slug，標章文字、說明與標章圖
 * 要到另一個畫面改 —— 編輯者填「關於我們」時被迫離開「關於我們」。
 * 這一版把整筆認證的內容收在同一格裡。
 * </p>
 *
 * <p>
 * ⚠️ 認證是**共用的**：同一筆同時餵 About 的認證帶與產品頁的標章列
 * （docs/05 §3.3）。就地編輯反而更容易讓人以為只影響這一頁，
 * 所以共用關係要寫在畫面上，見 <see cref="CertificationRefNotice"/>。
 * </p>
 */
export function CertificationRefField({
  value,
  onChange,
}: {
  /** 存的是 slug。 */
  value: string;
  onChange: (next: string) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminCertification | null>(null);
  const [creating, setCreating] = useState(false);

  const { data } = useQuery({
    queryKey: ['ref', 'Certification'],
    queryFn: () => api.certifications(),
    staleTime: 5 * 60_000,
  });

  const mediaUrls = useQuery({
    queryKey: ['media-all'],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  const current = data?.find((c) => c.slug === value);
  const logoUrl = current?.logoMediaId ? mediaUrls.data?.[current.logoMediaId] : null;

  const refresh = (saved: AdminCertification) => {
    queryClient.invalidateQueries({ queryKey: ['ref', 'Certification'] });
    queryClient.invalidateQueries({ queryKey: ['certifications'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    // 新建的那一筆直接填進這一格，否則編輯者還要自己再選一次
    if (saved.slug !== value) onChange(saved.slug);
    setEditing(null);
    setCreating(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <Icon name="seal" className="icon icon-sm" />
          )}
        </span>

        <select
          className="form-control flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">（未選擇）</option>
          {(data ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.mark}
            </option>
          ))}
        </select>

        {current && <StatusTag status={current.status} />}

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          disabled={!current}
          onClick={() => current && setEditing(current)}
        >
          編輯內容
        </button>

        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCreating(true)}>
          <Icon name="plus" className="icon icon-sm" />
          新增
        </button>
      </div>

      {(editing || creating) && (
        <CertificationDialog
          certification={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={refresh}
        />
      )}
    </>
  );
}

/** 共用關係的提示。放在整個區段的最上面，不是每一格都印一次。 */
export function CertificationRefNotice() {
  return (
    <p className="form-hint mb-3">
      這裡改的標章文字、說明與標章圖，<strong>產品頁的標章列也會跟著變</strong>{' '}
      —— 兩邊共用同一份認證。標章文字（如 ISO 13485）是品牌符號，不翻譯。
    </p>
  );
}
