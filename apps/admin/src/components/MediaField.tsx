import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError, type MediaItem, type MediaPreset } from '@/lib/api';
import {
  discardStaged,
  isStaged,
  setStagedAlt,
  stageMedia,
  stagedAlt,
  stagedPreviewUrl,
  useCommitProgress,
  useServerWarnings,
  type UploadWarning,
} from '@/lib/mediaStaging';
import { Icon } from './Icon';

/**
 * 媒體欄位。
 *
 * <p>
 * **每個欄位就地選自己的檔案。** 這裡不列媒體庫、不開挑圖對話框 ——
 * 編輯者在填「產品主圖」時要的是「把這張圖放上去」，不是「去一個放著全站素材的
 * 抽屜裡翻」。舊版把上傳藏在另一個畫面，於是填一個欄位要離開表單再走回來。
 * </p>
 *
 * <p>
 * **選檔案不會上傳。** 選的當下是瀏覽器本機預覽（`URL.createObjectURL`）加上
 * 當場量得出來的尺寸提醒；檔案要按下儲存才真的送上去（見 `lib/mediaStaging.ts`）。
 * 沒按儲存就關掉，雲端不會多出任何東西。
 * </p>
 *
 * <p>
 * 欄位顯示該 preset 的建議尺寸這一項不變，仍是 docs/03-cms.md §6 的流程。
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
 * 所有 preset。query key 全站共用一把，所以一頁上 N 個欄位只會打一次請求。
 * 提示文字與選檔時的尺寸檢查都吃這份資料。
 */
function usePreset(presetKey: string): MediaPreset | undefined {
  const { data } = useQuery({
    queryKey: ['media-presets'],
    queryFn: () => api.mediaPresets(),
    staleTime: 60 * 60_000,
  });

  return data?.presets.find((p) => p.key === presetKey);
}

/**
 * preset 提示文字。**不在畫面寫死**（docs/03 §5、docs/11 §1.1）——
 * 整句由後端 `MediaPreset.Hint(locale)` 產生，含尺寸、比例、格式、大小上限與縮圖寬度。
 * 改 `Api/Media/media-presets.json` 全後台同步生效。
 */
export function PresetHint({ presetKey }: { presetKey: string }) {
  const preset = usePreset(presetKey);

  // 還沒載入就不佔位 —— 提示突然冒出來會讓整張表單跳動
  if (!preset) return null;

  return <p className="form-hint">{preset.hint['zh-TW'] ?? preset.hint.en}</p>;
}

/**
 * 選檔案（**不上傳**）並回一個 `MediaItem` 形狀的替身。
 *
 * <p>
 * 格式不符當場擋下來，尺寸／比例／檔案大小當場提醒 —— 這些原本要等伺服器回話，
 * 現在伺服器要等到存檔才會看到這個檔案。
 * </p>
 */
function useFieldStaging(presetKey: string) {
  const preset = usePreset(presetKey);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<UploadWarning[]>([]);

  /**
   * @param append 一次選多個檔案時，後面幾個的提醒要加在前面那些後面，
   *   不然只有最後一個檔案的提醒留得下來 —— 而被提醒的往往是中間那張。
   */
  const stage = async (file: File, { append = false } = {}) => {
    try {
      const result = await stageMedia(presetKey, file, preset);
      const labelled = append
        ? result.warnings.map((w) => ({ ...w, message: `${file.name}：${w.message}` }))
        : result.warnings;

      setError(null);
      setWarnings((current) => (append ? [...current, ...labelled] : labelled));
      return result.media;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '這個檔案無法使用。');
      if (!append) setWarnings([]);
      return null;
    }
  };

  const reset = () => {
    setError(null);
    setWarnings([]);
  };

  return { stage, error, warnings, reset };
}

/** 還沒上傳的提示。存檔時會看到它換成上傳進度。 */
function StagedBadge({ ids }: { ids: (string | null | undefined)[] }) {
  const progress = useCommitProgress();
  const pending = ids.filter(isStaged).length;

  if (pending === 0) return null;

  return (
    <span className="badge" style={{ color: 'var(--yellow)' }}>
      {progress ? `上傳中 ${progress.done}/${progress.total}…` : '待上傳'}
    </span>
  );
}

/**
 * 訊息區：紅字是擋下來的，黃字是可以存但值得知道的。
 *
 * <p>
 * 黃字有兩個來源：選檔時在瀏覽器量出來的，以及存檔上傳後伺服器回的
 * （docs/11 §4，兩邊同一套門檻）。後者以真正的 mediaId 為 key，
 * 所以存完檔、欄位換成真 id 之後，提醒仍停在同一個位置。
 * </p>
 */
function UploadFeedback({
  error,
  warnings,
  mediaIds = [],
}: {
  error: string | null;
  warnings: UploadWarning[];
  mediaIds?: (string | null | undefined)[];
}) {
  const fromServer = useServerWarnings(mediaIds);
  const all = [...warnings, ...fromServer.filter((w) => !warnings.some((x) => x.code === w.code))];

  return (
    <>
      {error && (
        <p className="form-hint" style={{ color: 'var(--red)' }} role="alert">
          {error}
        </p>
      )}
      {all.map((w, i) => (
        <p key={`${w.code}-${i}`} className="form-hint" style={{ color: 'var(--yellow)' }}>
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
  onFiles,
}: {
  presetKey: string;
  label: ReactNode;
  variant?: string;
  multiple?: boolean;
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
      <button type="button" className={`btn btn-sm ${variant}`} onClick={() => ref.current?.click()}>
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
    enabled: mediaId !== null && !isStaged(mediaId),
  });

  return mediaId ? data?.[mediaId] : undefined;
}

/**
 * alt 文字。**這是全後台唯一的 alt 入口**（媒體庫那一頁已移除），
 * 而全站的 `<img alt>` 都取自 `Media.AltText` —— 少了它，
 * 無障礙與 SEO 就只能靠檔名。
 */
function AltInput({ mediaId }: { mediaId: string }) {
  return isStaged(mediaId) ? (
    <StagedAltInput mediaId={mediaId} />
  ) : (
    <SavedAltInput mediaId={mediaId} />
  );
}

/** 待上傳的圖沒有 `Media` 那一列可以 PATCH —— 記在暫存裡，上傳時一起送。 */
function StagedAltInput({ mediaId }: { mediaId: string }) {
  const [value, setValue] = useState(() => stagedAlt(mediaId));

  return (
    <input
      className="form-control"
      placeholder="alt 文字：描述圖片內容，供螢幕閱讀器與搜尋引擎使用"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setStagedAlt(mediaId, e.target.value);
      }}
    />
  );
}

/** 已存在的圖。離開焦點才送出：每打一個字就 PATCH 一次太吵。 */
function SavedAltInput({ mediaId }: { mediaId: string }) {
  const initial = useMediaAlt(mediaId) ?? '';

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
  const { stage, error, warnings, reset } = useFieldStaging(presetKey);

  // 呼叫端把 media.url 記進自己的縮圖表，所以 url 通常已經是預覽網址；
  // 沒記的呼叫端（例如只存 id 的 schema 欄位）由暫存補上
  const preview = url ?? stagedPreviewUrl(mediaId);

  const pick = async (files: File[]) => {
    const media = await stage(files[0]);
    if (!media) return;
    discardStaged(mediaId); // 換圖：上一張還沒上傳就不必留著
    onChange(media);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className="block h-16 w-16 shrink-0 overflow-hidden rounded-sm"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
        </span>

        <span className="flex flex-1 flex-col gap-2">
          <span className="flex items-center gap-2">
            <FileButton
              presetKey={presetKey}
              label={mediaId ? '更換' : '選擇圖片'}
              onFiles={pick}
            />
            {mediaId && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                onClick={() => {
                  reset();
                  discardStaged(mediaId);
                  onChange(null);
                }}
              >
                移除
              </button>
            )}
            <StagedBadge ids={[mediaId]} />
          </span>

          {mediaId && <AltInput key={mediaId} mediaId={mediaId} />}
        </span>
      </div>

      <PresetHint presetKey={presetKey} />
      <UploadFeedback error={error} warnings={warnings} mediaIds={[mediaId]} />
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
  /** mediaId → url。列表端點不回圖片網址，存檔之後才知道 */
  urls: Record<string, string>;
  onChange: (next: { mediaId: string; isPrimary: boolean; sortOrder: number }[]) => void;
  showPrimary?: boolean;
}) {
  const { stage, error, warnings, reset } = useFieldStaging(presetKey);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = images.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })));
  };

  const add = async (files: File[]) => {
    const added: typeof images = [];
    reset();

    for (const file of files) {
      const media = await stage(file, { append: true });
      if (!media) break; // 擋下來的那一個已經寫在 error 上，後面的不再處理
      added.push({
        mediaId: media.id,
        // 第一張自動成為主圖 —— 沒有主圖的話前台會取排序第一張，
        // 但那是隱含行為，明講出來編輯者才知道現在是哪張
        isPrimary: images.length === 0 && added.length === 0,
        sortOrder: images.length + added.length,
      });
    }

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
              {(urls[img.mediaId] ?? stagedPreviewUrl(img.mediaId)) && (
                <img
                  src={urls[img.mediaId] ?? stagedPreviewUrl(img.mediaId)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </span>

            {isStaged(img.mediaId) && (
              <div className="px-1.5 pt-1.5">
                <StagedBadge ids={[img.mediaId]} />
              </div>
            )}

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
                    discardStaged(img.mediaId);
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
        label={
          <>
            <Icon name="plus" className="icon icon-sm" />
            選擇圖片
          </>
        }
        onFiles={add}
      />

      <PresetHint presetKey={presetKey} />
      <UploadFeedback
        error={error}
        warnings={warnings}
        mediaIds={images.map((img) => img.mediaId)}
      />
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
  const { stage, error, warnings, reset } = useFieldStaging('document');

  const pick = async (files: File[]) => {
    const media = await stage(files[0]);
    if (!media) return;
    discardStaged(mediaId);
    onChange(media);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="mono flex-1 truncate text-[0.82rem]">
          {fileName ??
            (mediaId ? mediaId : <span style={{ color: 'var(--red)' }}>尚未選擇檔案</span>)}
        </span>

        <StagedBadge ids={[mediaId]} />

        <FileButton
          presetKey="document"
          label={mediaId ? '換檔案' : '選擇檔案'}
          onFiles={pick}
        />

        {mediaId && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              reset();
              discardStaged(mediaId);
              onChange(null);
            }}
          >
            移除
          </button>
        )}
      </div>

      <PresetHint presetKey="document" />
      <UploadFeedback error={error} warnings={warnings} mediaIds={[mediaId]} />
    </>
  );
}
