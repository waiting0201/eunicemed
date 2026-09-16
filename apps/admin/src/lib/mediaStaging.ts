import { useMemo, useSyncExternalStore } from 'react';
import { api, ApiError, type MediaItem, type MediaPreset, type UploadResult } from './api';
import { queryClient } from './queryClient';

/**
 * 圖片與檔案的**延後上傳**。
 *
 * <p>
 * 選檔案不等於上傳。選的當下只做三件事：用 `URL.createObjectURL` 生一個本機預覽、
 * 在瀏覽器裡量一次尺寸並給出與伺服器同一套的提醒、把 `File` 記在這裡並回一個
 * `staged:` 開頭的暫時 id。**真正的上傳發生在存檔時**（`commitStagedMedia`）。
 * </p>
 *
 * <p>
 * 這樣做的理由：先前選完就傳，等於「按了選擇圖片」就在 Blob 與 `Media` 表留下一筆，
 * 使用者按取消、關掉對話框、或改選另一張，前一張都已經是孤兒了 ——
 * 而後台沒有媒體庫畫面可以去清。現在沒按儲存就什麼都沒發生。
 * </p>
 *
 * <p>
 * 表單完全不必知道這件事：`stageMedia` 回的是一個 `MediaItem` 形狀的替身，
 * 現有的 `onChange(media)` 照樣把 `media.id` 寫進草稿、把 `media.url` 記進縮圖表。
 * 存檔時 `commitStagedMedia(body)` 會走過整包 payload，把暫時 id 換成真正的 id。
 * </p>
 */

const PREFIX = 'staged:';

type StagedFile = {
  presetKey: string;
  file: File;
  previewUrl: string;
  altText: string;
};

/** 尚未上傳的檔案。commit 成功或使用者移除時才離開這裡。 */
const staged = new Map<string, StagedFile>();

/**
 * 已上傳、但表單狀態可能還握著暫時 id 的過渡期（存檔到重讀之間的幾百毫秒）。
 *
 * <p>
 * 也是**重試的安全網**：一次 commit 傳了三張、第三張失敗時，前兩張已經在雲端了。
 * 使用者再按一次儲存，前兩張要對應到既有的 media，不能再傳一次。
 * </p>
 */
const aliases = new Map<string, MediaItem>();

/** 伺服器在上傳後回的非阻擋提醒，key 是真正的 mediaId（docs/11 §4）。 */
const serverWarnings = new Map<string, UploadWarning[]>();

export type UploadWarning = NonNullable<UploadResult['warnings']>[number];

const NO_WARNINGS: UploadWarning[] = [];

let progress: { done: number; total: number } | null = null;
let version = 0;

const listeners = new Set<() => void>();

function emit() {
  version++;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function isStaged(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(PREFIX);
}

/** 暫時 id 的預覽網址；上傳之後改指真正的網址，畫面不會在存檔瞬間閃成空白。 */
export function stagedPreviewUrl(id: string | null | undefined): string | undefined {
  if (!isStaged(id)) return undefined;
  return staged.get(id!)?.previewUrl ?? aliases.get(id!)?.url;
}

export function stagedFileName(id: string | null | undefined): string | undefined {
  if (!isStaged(id)) return undefined;
  return staged.get(id!)?.file.name ?? aliases.get(id!)?.fileName;
}

export function stagedAlt(id: string): string {
  return staged.get(id)?.altText ?? '';
}

/** 待上傳檔案的 alt。沒有 `Media` 那一列可以 PATCH，所以記在這裡、上傳時一起送。 */
export function setStagedAlt(id: string, altText: string) {
  const entry = staged.get(id);
  if (entry) entry.altText = altText;
}

/** 使用者把還沒上傳的圖移除了 —— 釋放 blob，別讓它留到分頁關掉。 */
export function discardStaged(id: string | null | undefined) {
  if (!isStaged(id)) return;
  const entry = staged.get(id!);
  if (!entry) return;
  URL.revokeObjectURL(entry.previewUrl);
  staged.delete(id!);
}

/**
 * 選了一個檔案。**不上傳**，回一個 `MediaItem` 形狀的替身與當下就量得出來的提醒。
 *
 * @throws {ApiError} 格式不符 —— 這種是會被伺服器以 415 擋下的，等到存檔才說太晚。
 */
export async function stageMedia(
  presetKey: string,
  file: File,
  preset: MediaPreset | undefined,
): Promise<{ media: MediaItem; warnings: UploadWarning[] }> {
  requireAcceptedFormat(file, presetKey, preset);

  const size = await probeImageSize(file);
  const warnings = inspect(file, size, preset);

  const id = `${PREFIX}${crypto.randomUUID()}`;
  const previewUrl = URL.createObjectURL(file);

  staged.set(id, { presetKey, file, previewUrl, altText: '' });

  return {
    media: {
      id,
      presetKey,
      url: previewUrl,
      fileName: file.name,
      altText: '',
      width: size?.width ?? 0,
      height: size?.height ?? 0,
      sizeBytes: file.size,
      variantCount: 0,
      usageCount: 0,
      belowPresetWidth: Boolean(preset?.width && size && size.width < preset.width),
      createdAt: new Date().toISOString(),
    },
    warnings,
  };
}

/**
 * 存檔前的最後一步：把 payload 裡出現過的暫時 id 真的傳上去，回一份換成真 id 的 payload。
 *
 * <p>
 * **一張一張傳，不並行** —— Function App 實例只有 2048MB，同時解碼多張 2560px
 * 來源圖會 OOM（docs/07 §10）。
 * </p>
 *
 * <p>
 * 只傳 payload 裡真的用到的 —— 選了又移除的、或別張表單留下的，都不會被送上去。
 * </p>
 */
export async function commitStagedMedia<T>(payload: T): Promise<T> {
  const ids = collectStagedIds(payload);
  if (ids.length === 0) return payload;

  const resolved = new Map<string, string>();

  progress = { done: 0, total: ids.length };
  emit();

  try {
    for (const [i, id] of ids.entries()) {
      const entry = staged.get(id);

      if (!entry) {
        // 上一次 commit 已經傳過了（那次存檔後段失敗）—— 不要再傳一次
        const already = aliases.get(id);
        if (!already) throw new ApiError(0, '有一張圖的暫存資料已遺失，請重新選擇檔案。');
        resolved.set(id, already.id);
        continue;
      }

      const media =
        entry.presetKey === 'document'
          ? await api.uploadDocument(entry.file, entry.file.name)
          : await api.uploadMedia(entry.presetKey, entry.file, entry.altText);

      const warnings = (media as UploadResult).warnings;
      if (warnings?.length) serverWarnings.set(media.id, warnings);

      aliases.set(id, media);
      URL.revokeObjectURL(entry.previewUrl);
      staged.delete(id);
      resolved.set(id, media.id);

      progress = { done: i + 1, total: ids.length };
      emit();
    }
  } finally {
    progress = null;
    emit();
  }

  // 縮圖表（各編輯頁的 mediaId → url）要看得到剛上傳的這幾張
  queryClient.invalidateQueries({ queryKey: ['media-all'] });

  return replaceIds(payload, resolved) as T;
}

// ── 給元件用的訂閱 ───────────────────────────────────────────────────────────

/** commit 進行中的進度；沒有 commit 在跑時是 `null`。 */
export function useCommitProgress() {
  return useSyncExternalStore(subscribe, () => progress);
}

/**
 * 這些 media 的伺服器提醒。存檔之後才會有值 ——
 * 那時欄位握的已經是真正的 id，所以顯示的位置與選檔時那一則一致。
 */
export function useServerWarnings(mediaIds: (string | null | undefined)[]): UploadWarning[] {
  // key 與 stamp 都是純量，所以這個 memo 不會每次 render 都重算出新陣列
  const stamp = useSyncExternalStore(subscribe, versionOf);
  const key = mediaIds.filter(Boolean).join(',');

  return useMemo(() => {
    void stamp;
    return key.split(',').flatMap((id) => serverWarnings.get(id) ?? NO_WARNINGS);
  }, [key, stamp]);
}

function versionOf() {
  return version;
}

// ── 內部 ────────────────────────────────────────────────────────────────────

/** 與 `ImageService.Inspect` 同一套門檻（偏離 5%、寬度 0.8 倍、maxBytes）。 */
function inspect(
  file: File,
  size: { width: number; height: number } | null,
  preset: MediaPreset | undefined,
): UploadWarning[] {
  const warnings: UploadWarning[] = [];
  if (!preset) return warnings;

  if (size && preset.width && preset.height) {
    const want = preset.width / preset.height;
    const actual = size.width / size.height;
    if (Math.abs(actual - want) / want > 0.05)
      warnings.push({
        code: 'aspect_mismatch',
        expected: preset.aspect,
        actual: `${size.width}:${size.height}`,
        message: `此欄位建議 ${preset.aspect}，您的圖為 ${size.width}×${size.height}，兩側會被裁切。`,
      });

    if (size.width < preset.width * 0.8)
      warnings.push({
        code: 'low_resolution',
        expected: `${preset.width}px`,
        actual: `${size.width}px`,
        message: `建議寬度 ${preset.width}px，您的圖只有 ${size.width}px，放大顯示時會糊。`,
      });
  }

  if (preset.maxBytes && file.size > preset.maxBytes)
    warnings.push({
      code: 'oversized',
      expected: `${Math.round(preset.maxBytes / 1024)} KB`,
      actual: `${Math.round(file.size / 1024)} KB`,
      message: `建議 ≤${Math.round(preset.maxBytes / 1024)} KB，您的檔案 ${Math.round(
        file.size / 1024,
      )} KB，載入會偏慢。`,
    });

  return warnings;
}

/**
 * 格式檢查。伺服器對不收的格式回 415，而現在存檔才會知道 ——
 * 選的當下就擋下來，錯誤才指得到是哪一個欄位。
 */
function requireAcceptedFormat(file: File, presetKey: string, preset: MediaPreset | undefined) {
  const formats = preset?.formats ?? (presetKey === 'document' ? ['pdf'] : []);
  if (formats.length === 0) return;

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const normalised = ext === 'jpeg' ? 'jpg' : ext;

  if (!formats.includes(normalised))
    throw new ApiError(415, `這個欄位只收 ${formats.join(' / ')}，您選的是 .${ext || '未知'}。`);
}

/** 量原圖尺寸。SVG 與量不出來的一律回 null —— 量不到就不提醒，不要亂猜。 */
async function probeImageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return null;

  try {
    // from-image：套用 EXIF 方向，與使用者在看圖軟體裡看到的方向一致
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

function collectStagedIds(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') {
    if (isStaged(value) && !found.includes(value)) found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStagedIds(item, found);
    return found;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStagedIds(item, found);
  }
  return found;
}

function replaceIds(value: unknown, map: Map<string, string>): unknown {
  if (typeof value === 'string') return map.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => replaceIds(item, map));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceIds(item, map)]),
    );
  }
  return value;
}
