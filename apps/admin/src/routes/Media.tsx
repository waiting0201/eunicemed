import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type MediaItem, type UploadResult } from '@/lib/api';
import { ListPage } from '@/components/ListPage';
import { Icon } from '@/components/Icon';
import { formatBytes, formatDate } from '@/lib/format';

/**
 * 媒體庫。
 *
 * <p>
 * 每個編輯畫面都依賴這裡 —— 圖片選擇器只能挑既有的圖，
 * 上傳與 alt 文字維護都在這一頁。
 * </p>
 */
export function Media() {
  const queryClient = useQueryClient();
  const [presetKey, setPresetKey] = useState('');
  const [search, setSearch] = useState('');
  const [inspecting, setInspecting] = useState<MediaItem | null>(null);

  const presets = useQuery({
    queryKey: ['media-presets'],
    queryFn: () => api.mediaPresets(),
    staleTime: 60 * 60_000,
  });

  const { data, isPending, error } = useQuery({
    queryKey: ['media', presetKey, search],
    queryFn: () => api.media({ presetKey: presetKey || undefined, search: search || undefined }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['media'] });
    queryClient.invalidateQueries({ queryKey: ['media-all'] });
  };

  return (
    <ListPage
      eyebrow="素材"
      title="媒體庫"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.length}</span> 張
          </span>
        )
      }
      filters={
        <>
          <input
            type="search"
            className="form-control w-56"
            placeholder="搜尋檔名或說明文字"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-control w-56"
            value={presetKey}
            onChange={(e) => setPresetKey(e.target.value)}
          >
            <option value="">全部尺寸規格</option>
            {(presets.data?.presets ?? []).map((p) => (
              <option key={p.key} value={p.key}>
                {p.label['zh-TW'] ?? p.label.en}
              </option>
            ))}
          </select>
        </>
      }
    >
      <UploadPanel presets={presets.data?.presets ?? []} onUploaded={refresh} />

      {error != null && (
        <p role="alert" className="alert mb-4">
          {error instanceof Error ? error.message : '讀取失敗。'}
        </p>
      )}

      {isPending && <p style={{ color: 'var(--text-muted)' }}>載入中…</p>}

      {data?.length === 0 && (
        <p className="panel panel-body text-center" style={{ color: 'var(--text-muted)' }}>
          這個條件下沒有圖片。換個尺寸規格，或先上傳一張。
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data?.map((media) => (
          <button
            key={media.id}
            type="button"
            onClick={() => setInspecting(media)}
            className="panel overflow-hidden text-left"
          >
            <span
              className="block aspect-square overflow-hidden"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <img
                src={media.url}
                alt={media.altText ?? ''}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="block p-2">
              <span className="mono block truncate text-[0.72rem]">{media.fileName}</span>
              <span
                className="block truncate text-[0.72rem]"
                style={{ color: media.altText ? 'var(--text-muted)' : 'var(--red)' }}
              >
                {/* alt 缺漏要標出來 —— 它是無障礙必要欄位，
                    而缺了在畫面上完全看不出來 */}
                {media.altText ?? '缺 alt 文字'}
              </span>
              <span className="mono block text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
                {media.usageCount > 0 ? `${media.usageCount} 處引用` : '未使用'}
                {media.belowPresetWidth && (
                  <span style={{ color: 'var(--red)' }}> · 解析度不足</span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>

      {inspecting && (
        <Inspector
          media={inspecting}
          onClose={() => setInspecting(null)}
          onChanged={() => {
            refresh();
            setInspecting(null);
          }}
        />
      )}
    </ListPage>
  );
}

/**
 * 上傳。**尺寸提示來自 `GET /admin/media-presets`**（docs/03 §5 全域規則）——
 * 選了規格才顯示提示，因為每個版位的要求不同。
 */
function UploadPanel({
  presets,
  onUploaded,
}: {
  presets: { key: string; label: Record<string, string>; hint: Record<string, string> }[];
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [presetKey, setPresetKey] = useState('');
  const [altText, setAltText] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preset = presets.find((p) => p.key === presetKey);

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadMedia(presetKey, file, altText),
    onSuccess: (uploaded) => {
      setResult(uploaded);
      setError(null);
      setAltText('');
      if (fileRef.current) fileRef.current.value = '';
      onUploaded();
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof ApiError ? err.message : '上傳失敗。');
    },
  });

  return (
    <div className="panel mb-5">
      <div className="panel-header">
        <h2 className="text-[0.95rem] font-semibold">上傳</h2>
      </div>

      <div className="panel-body">
        <div className="grid gap-3 sm:grid-cols-[16rem_1fr_auto] sm:items-end">
          <label className="block">
            <span className="form-label">尺寸規格</span>
            <select
              className="form-control"
              value={presetKey}
              onChange={(e) => setPresetKey(e.target.value)}
            >
              <option value="">請選擇版位</option>
              {presets.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label['zh-TW'] ?? p.label.en}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="form-label">alt 文字</span>
            <input
              className="form-control"
              placeholder="描述圖片內容，供螢幕閱讀器與搜尋引擎使用"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
            />
          </label>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!presetKey || upload.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {upload.isPending ? '上傳中…' : '選擇檔案'}
            </button>
          </div>
        </div>

        {/* 提示文字不在畫面寫死，改 media-presets.json 全後台同步生效 */}
        {preset && <p className="form-hint mt-2">{preset.hint['zh-TW'] ?? preset.hint.en}</p>}

        {!presetKey && (
          <p className="form-hint mt-2">
            先選版位再上傳 —— 伺服器依該版位的寬度縮圖，選錯的話圖會被裁切。
          </p>
        )}

        {error && (
          <p role="alert" className="alert mt-3">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-3">
            <p className="badge" style={{ color: 'var(--green)' }}>
              <Icon name="check" className="icon icon-sm" />
              已上傳 {result.fileName}
            </p>
            {/*
              warnings 是非阻擋的（docs/11 §4）—— 圖已經存進去了。
              不顯示的話，比例不符與解析度不足會等到前台才被發現。
            */}
            {result.warnings?.map((w) => (
              <p key={w.code} className="form-hint mt-1" style={{ color: 'var(--yellow)' }}>
                {w.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 單張圖的細節：alt 編輯、引用反查、刪除。 */
function Inspector({
  media,
  onClose,
  onChanged,
}: {
  media: MediaItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [altText, setAltText] = useState(media.altText ?? '');
  const [error, setError] = useState<string | null>(null);

  const usages = useQuery({
    queryKey: ['media-usages', media.id],
    queryFn: () => api.mediaUsages(media.id),
  });

  const save = useMutation({
    mutationFn: () => api.updateMedia(media.id, altText),
    onSuccess: onChanged,
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteMedia(media.id),
    onSuccess: onChanged,
    // 有引用時後端回 409。訊息已經說明還有幾處引用，原樣顯示就好
    onError: (e) => setError(e instanceof ApiError ? e.message : '刪除失敗。'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="panel w-[min(48rem,92vw)] max-h-[88vh] overflow-y-auto">
        <div className="panel-header">
          <h2 className="mono truncate text-[0.9rem]">{media.fileName}</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            關閉
          </button>
        </div>

        <div className="panel-body grid gap-5 sm:grid-cols-[16rem_1fr]">
          <div>
            <img
              src={media.url}
              alt={media.altText ?? ''}
              className="w-full rounded-sm"
              style={{ background: 'var(--bg-elevated)' }}
            />
            <dl className="mt-3 space-y-1 text-[0.8rem]">
              <Row label="尺寸規格" value={media.presetKey} />
              <Row label="原始尺寸" value={`${media.width}×${media.height}`} />
              <Row label="檔案大小" value={formatBytes(media.sizeBytes)} />
              <Row label="輸出變體" value={`${media.variantCount} 個`} />
              <Row label="上傳於" value={formatDate(media.createdAt)} />
            </dl>
            {media.belowPresetWidth && (
              <p className="form-hint mt-2" style={{ color: 'var(--red)' }}>
                來源寬度低於這個版位的建議值，放大顯示會糊。
              </p>
            )}
          </div>

          <div>
            <label className="block">
              <span className="form-label">alt 文字</span>
              <input
                className="form-control"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </label>
            <p className="form-hint">供螢幕閱讀器與搜尋引擎使用。裝飾性圖片可留空。</p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={save.isPending || altText === (media.altText ?? '')}
                onClick={() => save.mutate()}
              >
                儲存 alt 文字
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                刪除這張圖
              </button>
            </div>

            {error && (
              <p role="alert" className="alert mt-3">
                {error}
              </p>
            )}

            {/* 後端只回 entityId，不回那筆內容的名稱 ——
                所以這裡只說得出「哪一種內容的哪個欄位」，說不出是哪一筆。
                要能點過去的話，usages 端點得一併回標題。 */}
            <h3 className="form-label mt-5">引用位置</h3>
            {usages.isPending && <p className="form-hint">查詢中…</p>}
            {usages.data?.length === 0 && (
              <p className="form-hint">沒有任何地方使用這張圖，可以安全刪除。</p>
            )}
            <ul className="space-y-1 text-[0.82rem]">
              {usages.data?.map((u, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{describeUsage(u.entity)}</span>
                  <span className="mono" style={{ color: 'var(--text-muted)' }}>
                    {u.fieldPath}
                    {u.locale && ` · ${u.locale}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  );
}

/**
 * 引用來源的中文名稱。後端回的是實體型別名（`PageSection`、`Product`…）——
 * 那是給程式看的，編輯者要看得懂是哪一種內容。
 */
function describeUsage(entity: string): string {
  const names: Record<string, string> = {
    PageSection: '頁面區段',
    Product: '產品',
    Article: '文章',
    Application: '應用方案',
    Category: '分類',
    SubCategory: '子分類',
    Certification: '認證',
    Download: '下載',
  };
  return names[entity] ?? entity;
}
