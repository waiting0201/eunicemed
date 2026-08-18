import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type MediaItem } from '@/lib/api';
import { Icon } from './Icon';

/**
 * 媒體選擇器。
 *
 * <p>
 * **依 presetKey 篩選**：每個上傳版位都宣告了它要哪種尺寸
 * （schema 的 `x-mediaPreset`、實體欄位則見 docs/11）。只列出符合的圖，
 * 編輯者就不會挑到會被裁切的那張 —— 後端也會擋，但等到存檔才報錯太晚。
 * </p>
 *
 * <p>
 * 用原生 `<dialog>`：焦點鎖定、Esc 關閉、背景 inert 都由瀏覽器處理，
 * 比自己實作一個 modal 可靠，也不用引套件（打包體積計入 SWA 的 250MB）。
 * </p>
 */
export function MediaPicker({
  presetKey,
  open,
  onClose,
  onPick,
  excludeIds = [],
}: {
  presetKey: string;
  open: boolean;
  onClose: () => void;
  onPick: (media: MediaItem) => void;
  /** 已經選過的不再列出，避免同一張圖被加兩次 */
  excludeIds?: string[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const { data, isPending } = useQuery({
    queryKey: ['media', presetKey, search],
    queryFn: () => api.media({ presetKey, search: search || undefined }),
    enabled: open,
  });

  const presets = useQuery({
    queryKey: ['media-presets'],
    queryFn: () => api.mediaPresets(),
    staleTime: 60 * 60_000,
  });

  const preset = presets.data?.presets.find((p) => p.key === presetKey);
  const items = (data ?? []).filter((m) => !excludeIds.includes(m.id));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="w-[min(52rem,92vw)] rounded-md p-0 backdrop:bg-black/40"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="panel-header">
        <div>
          <h2 className="text-[0.95rem] font-semibold">選擇圖片</h2>
          {/* 提示文字來自 GET /admin/media-presets，不在畫面寫死（docs/03 §5）*/}
          {preset && <p className="form-hint">{preset.hint['zh-TW'] ?? preset.hint.en}</p>}
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
          關閉
        </button>
      </div>

      <div className="panel-body">
        <input
          type="search"
          className="form-control mb-4"
          placeholder="搜尋檔名或說明文字"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isPending && <p style={{ color: 'var(--text-muted)' }}>載入中…</p>}

        {!isPending && items.length === 0 && (
          <p className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
            這個尺寸規格底下還沒有圖片。請先到媒體庫上傳。
          </p>
        )}

        <div className="grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-4">
          {items.map((media) => (
            <button
              key={media.id}
              type="button"
              onClick={() => {
                onPick(media);
                onClose();
              }}
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
                  className="mono block text-[0.7rem]"
                  style={{ color: media.belowPresetWidth ? 'var(--red)' : 'var(--text-muted)' }}
                >
                  {media.width}×{media.height}
                  {/* 來源比 preset 窄的圖放大會糊 —— 挑之前就要看得到 */}
                  {media.belowPresetWidth && ' · 解析度不足'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}

/**
 * 單張圖片欄位（使用情境照、og 圖…）。
 * 多張的圖庫用 <see cref="ImageList"/>。
 */
export function ImageField({
  presetKey,
  mediaId,
  url,
  onChange,
}: {
  presetKey: string;
  mediaId: string | null;
  url?: string | null;
  onChange: (media: MediaItem | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className="block h-16 w-16 shrink-0 overflow-hidden rounded-sm"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </span>
        <span className="flex gap-2">
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(true)}>
            {mediaId ? '更換' : '選擇圖片'}
          </button>
          {mediaId && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ color: 'var(--red)' }}
              onClick={() => onChange(null)}
            >
              移除
            </button>
          )}
        </span>
      </div>

      <MediaPicker
        presetKey={presetKey}
        open={open}
        onClose={() => setOpen(false)}
        onPick={onChange}
      />
    </>
  );
}

/**
 * 多張圖片 + 排序 + 主圖。
 *
 * <p>
 * **主圖唯一由這裡保證**（DB 端沒有約束，docs/05 §3.2）。
 * 主圖決定列表卡與詳情頁第一張圖 —— 兩者取同一張，換主圖要兩邊一起變。
 * </p>
 */
export function ImageList({
  presetKey,
  images,
  urls,
  onChange,
}: {
  presetKey: string;
  images: { mediaId: string; isPrimary: boolean; sortOrder: number }[];
  /** mediaId → url。列表端點不回圖片網址，選過之後才知道 */
  urls: Record<string, string>;
  onChange: (next: { mediaId: string; isPrimary: boolean; sortOrder: number }[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = images.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })));
  };

  return (
    <>
      <div className="mb-2 grid gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.mediaId} className="panel overflow-hidden">
            <span
              className="block aspect-square overflow-hidden"
              style={{ background: 'var(--bg-elevated)' }}
            >
              {urls[img.mediaId] && (
                <img src={urls[img.mediaId]} alt="" className="h-full w-full object-cover" />
              )}
            </span>

            <div className="flex items-center justify-between gap-1 p-1.5">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                aria-pressed={img.isPrimary}
                title={img.isPrimary ? '目前的主圖' : '設為主圖'}
                onClick={() =>
                  onChange(images.map((x) => ({ ...x, isPrimary: x.mediaId === img.mediaId })))
                }
                style={{ color: img.isPrimary ? 'var(--accent)' : undefined }}
              >
                {img.isPrimary ? '主圖' : '設為主圖'}
              </button>

              <span className="flex">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label="上移"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={i === images.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label="下移"
                >
                  →
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--red)' }}
                  aria-label="移除"
                  onClick={() => {
                    const next = images
                      .filter((x) => x.mediaId !== img.mediaId)
                      .map((x, j) => ({ ...x, sortOrder: j }));
                    // 移掉主圖之後要補一張，否則列表卡與詳情頁的第一張圖會不一致
                    if (img.isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
                    onChange(next);
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(true)}>
        <Icon name="plus" className="icon icon-sm" />
        加入圖片
      </button>

      <MediaPicker
        presetKey={presetKey}
        open={open}
        onClose={() => setOpen(false)}
        excludeIds={images.map((i) => i.mediaId)}
        onPick={(media) =>
          onChange([
            ...images,
            {
              mediaId: media.id,
              // 第一張自動成為主圖 —— 沒有主圖的話前台會取排序第一張，
              // 但那是隱含行為，明講出來編輯者才知道現在是哪張
              isPrimary: images.length === 0,
              sortOrder: images.length,
            },
          ])
        }
      />
    </>
  );
}
