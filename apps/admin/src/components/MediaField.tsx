import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type MediaItem, type UploadResult } from '@/lib/api';
import { Icon } from './Icon';

/**
 * 媒體欄位。
 *
 * <p>
 * **每個欄位就地上傳自己的檔案。** 這裡不列媒體庫、不開挑圖對話框 ——
 * 編輯者在填「產品主圖」時要的是「把這張圖放上去」，不是「去一個放著全站素材的
 * 抽屜裡翻」。舊版把上傳藏在另一個畫面，於是填一個欄位要離開表單再走回來。
 * </p>
 *
 * <p>
 * 流程即 docs/03-cms.md §6：欄位顯示該 preset 的建議尺寸 → 選本機檔 →
 * `POST /admin/media`（多帶 `presetKey`）→ 伺服器依該 preset 縮圖並回 `warnings`。
 * </p>
 */

/** 只有這兩個 preset 收 SVG（後端 `MediaHandler.UploadSvgAsync`），其餘一律 415。 */
const SVG_PRESETS = new Set(['logo-mark', 'measure-diagram']);

function acceptFor(presetKey: string): string {
  if (presetKey === 'document') return 'application/pdf';
  const base = 'image/jpeg,image/png,image/webp';
  return SVG_PRESETS.has(presetKey) ? `${base},image/svg+xml` : base;
}

/**
 * preset 提示文字。**不在畫面寫死**（docs/03 §5、docs/11 §1.1）——
 * 整句由後端 `MediaPreset.Hint(locale)` 產生，含尺寸、比例、格式、大小上限與縮圖寬度。
 * 改 `Api/Media/media-presets.json` 全後台同步生效。
 *
 * <p>query key 全站共用一把，所以一頁上 N 個欄位只會打一次請求。</p>
 */
export function PresetHint({ presetKey }: { presetKey: string }) {
  const { data } = useQuery({
    queryKey: ['media-presets'],
    queryFn: () => api.mediaPresets(),
    staleTime: 60 * 60_000,
  });

  const preset = data?.presets.find((p) => p.key === presetKey);
  // 還沒載入就不佔位 —— 提示突然冒出來會讓整張表單跳動
  if (!preset) return null;

  return <p className="form-hint">{preset.hint['zh-TW'] ?? preset.hint.en}</p>;
}

/**
 * 上傳一個本機檔案並回傳它的 `MediaItem`。
 *
 * <p>
 * PDF 走 SAS 直傳（不佔用 Function），圖片走 multipart 代傳讓伺服器縮圖 ——
 * 這個分歧本來寫在媒體庫那一頁，現在每個欄位都會用到，所以收在這裡。
 * </p>
 */
function useFieldUpload(presetKey: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<UploadResult['warnings']>(undefined);

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<MediaItem> => {
      if (presetKey === 'document') return api.uploadDocument(file, file.name);
      return api.uploadMedia(presetKey, file, '');
    },
    onSuccess: (media) => {
      setError(null);
      setWarnings((media as UploadResult).warnings);
      queryClient.invalidateQueries({ queryKey: ['media-all'] });
    },
    onError: (err) => {
      setWarnings(undefined);
      setError(err instanceof ApiError ? err.message : '上傳失敗。');
    },
  });

  return {
    upload: mutation.mutateAsync,
    isPending: mutation.isPending,
    error,
    warnings,
    reset: () => {
      setError(null);
      setWarnings(undefined);
    },
  };
}

/** 上傳結果的訊息區：紅字是擋下來的，黃字是存進去了但值得知道的。 */
function UploadFeedback({
  error,
  warnings,
}: {
  error: string | null;
  warnings: UploadResult['warnings'];
}) {
  return (
    <>
      {error && (
        <p className="form-hint" style={{ color: 'var(--red)' }} role="alert">
          {error}
        </p>
      )}
      {/*
        warnings 是非阻擋的（docs/11 §4）—— 圖已經存進去了。
        不顯示的話，比例不符與解析度不足會等到前台才被發現。
      */}
      {warnings?.map((w) => (
        <p key={w.code} className="form-hint" style={{ color: 'var(--yellow)' }}>
          {w.message}
        </p>
      ))}
    </>
  );
}

/**
 * 隱藏的檔案輸入 + 觸發按鈕。
 * `<input type="file">` 的原生外觀在各瀏覽器不一致，且無法套後台的按鈕樣式。
 */
function FileButton({
  presetKey,
  label,
  variant = 'btn-secondary',
  multiple = false,
  disabled,
  onFiles,
}: {
  presetKey: string;
  label: ReactNode;
  variant?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={acceptFor(presetKey)}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // 同一個檔案連選兩次也要觸發，所以每次都清掉 value
          e.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
      <button
        type="button"
        className={`btn btn-sm ${variant}`}
        disabled={disabled}
        onClick={() => ref.current?.click()}
      >
        {label}
      </button>
    </>
  );
}

/**
 * 已知的 alt 文字。與各編輯頁的縮圖表同一把 query key（`['media-all']`）——
 * 那份資料本來就整包 `MediaItem` 抓回來了，只是各頁的 `select` 只取了 url。
 * 共用 key 表示不會多打一次請求。
 */
function useMediaAlt(mediaId: string | null): string | undefined {
  const { data } = useQuery({
    queryKey: ['media-all'],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.altText ?? ''])),
    enabled: mediaId !== null,
  });

  return mediaId ? data?.[mediaId] : undefined;
}

/**
 * alt 文字。**這是全後台唯一的 alt 入口**（媒體庫那一頁已移除），
 * 而全站的 `<img alt>` 都取自 `Media.AltText` —— 少了它，
 * 無障礙與 SEO 就只能靠檔名。
 *
 * <p>離開焦點才送出：每打一個字就 PATCH 一次太吵。</p>
 */
function AltInput({ mediaId, uploaded }: { mediaId: string; uploaded?: string | null }) {
  const known = useMediaAlt(mediaId);
  const initial = uploaded ?? known ?? '';

  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);

  // 快取比第一次 render 晚到 —— 但只在使用者還沒動過這一格時才補寫，
  // 否則背景 refetch 會把正在打的字蓋掉。
  useEffect(() => {
    if (value === saved && initial !== saved) {
      setValue(initial);
      setSaved(initial);
    }
  }, [initial, value, saved]);

  const save = useMutation({
    mutationFn: (text: string) => api.updateMedia(mediaId, text),
    onSuccess: (_, text) => setSaved(text),
  });

  return (
    <input
      className="form-control"
      placeholder="alt 文字：描述圖片內容，供螢幕閱讀器與搜尋引擎使用"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== saved) save.mutate(value);
      }}
    />
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
  const { upload, isPending, error, warnings, reset } = useFieldUpload(presetKey);
  const [uploadedAlt, setUploadedAlt] = useState<string | null>(null);

  const pick = async (files: File[]) => {
    const media = await upload(files[0]).catch(() => null);
    if (media) {
      setUploadedAlt(media.altText ?? '');
      onChange(media);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className="block h-16 w-16 shrink-0 overflow-hidden rounded-sm"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </span>

        <span className="flex flex-1 flex-col gap-2">
          <span className="flex gap-2">
            <FileButton
              presetKey={presetKey}
              disabled={isPending}
              label={isPending ? '上傳中…' : mediaId ? '更換' : '選擇圖片'}
              onFiles={pick}
            />
            {mediaId && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                onClick={() => {
                  reset();
                  setUploadedAlt(null);
                  onChange(null);
                }}
              >
                移除
              </button>
            )}
          </span>

          {mediaId && (
            <AltInput key={mediaId} mediaId={mediaId} uploaded={uploadedAlt} />
          )}
        </span>
      </div>

      <PresetHint presetKey={presetKey} />
      <UploadFeedback error={error} warnings={warnings} />
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
  /** 文章圖庫沒有主圖的概念 —— 那一排按鈕在那裡只會讓人以為漏設了什麼 */
  showPrimary = true,
}: {
  presetKey: string;
  images: { mediaId: string; isPrimary: boolean; sortOrder: number }[];
  /** mediaId → url。列表端點不回圖片網址，上傳之後才知道 */
  urls: Record<string, string>;
  onChange: (next: { mediaId: string; isPrimary: boolean; sortOrder: number }[]) => void;
  showPrimary?: boolean;
}) {
  const { upload, isPending, error, warnings } = useFieldUpload(presetKey);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = images.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })));
  };

  /**
   * **一張一張傳，不並行。** Function App 實例只有 2048MB，
   * 同時解碼多張 2560px 來源圖會 OOM（docs/07 §10）。
   */
  const add = async (files: File[]) => {
    const added: typeof images = [];
    setProgress({ done: 0, total: files.length });

    for (const [i, file] of files.entries()) {
      const media = await upload(file).catch(() => null);
      if (media) {
        added.push({
          mediaId: media.id,
          // 第一張自動成為主圖 —— 沒有主圖的話前台會取排序第一張，
          // 但那是隱含行為，明講出來編輯者才知道現在是哪張
          isPrimary: images.length === 0 && added.length === 0,
          sortOrder: images.length + added.length,
        });
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setProgress(null);
    if (added.length > 0) onChange([...images, ...added]);
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

            <div className="p-1.5">
              <AltInput mediaId={img.mediaId} />
            </div>

            <div className="flex items-center justify-between gap-1 p-1.5 pt-0">
              {showPrimary && (
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
              )}

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

      <FileButton
        presetKey={presetKey}
        multiple
        disabled={isPending}
        label={
          progress ? (
            `上傳中 ${progress.done}/${progress.total}…`
          ) : (
            <>
              <Icon name="plus" className="icon icon-sm" />
              上傳圖片
            </>
          )
        }
        onFiles={add}
      />

      <PresetHint presetKey={presetKey} />
      <UploadFeedback error={error} warnings={warnings} />
    </>
  );
}

/**
 * 檔案欄位（PDF 型錄、說明書、認證文件）。
 *
 * <p>
 * 與 <see cref="ImageField"/> 分開，因為 PDF **沒有縮圖可看** ——
 * 用圖片格會排出一整片破圖。這裡列的是檔名，那正是編輯者核對 PDF 的依據。
 * </p>
 */
export function FileField({
  mediaId,
  fileName,
  onChange,
}: {
  mediaId: string | null;
  fileName?: string | null;
  onChange: (media: MediaItem | null) => void;
}) {
  const { upload, isPending, error, warnings, reset } = useFieldUpload('document');

  const pick = async (files: File[]) => {
    const media = await upload(files[0]).catch(() => null);
    if (media) onChange(media);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="mono flex-1 truncate text-[0.82rem]">
          {fileName ??
            (mediaId ? mediaId : <span style={{ color: 'var(--red)' }}>尚未選擇檔案</span>)}
        </span>

        <FileButton
          presetKey="document"
          disabled={isPending}
          label={isPending ? '上傳中…' : mediaId ? '換檔案' : '選擇檔案'}
          onFiles={pick}
        />

        {mediaId && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              reset();
              onChange(null);
            }}
          >
            移除
          </button>
        )}
      </div>

      <PresetHint presetKey="document" />
      <UploadFeedback error={error} warnings={warnings} />
    </>
  );
}
