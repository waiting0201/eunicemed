import { useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminPage, type MediaItem } from '@/lib/api';
import { commitStagedMedia, discardStaged } from '@/lib/mediaStaging';
import { Dialog, DialogActions } from './Dialog';
import { Field } from './form/Field';
import { ImageField } from './MediaField';

/**
 * 清單畫面頂端的「頁頂圖」。
 *
 * <p>
 * FAQ、下載、銷售據點、應用方案、最新消息、專欄文章這 6 頁，在 CMS 裡唯一能改的
 * 版面元素就是那條 16:3 的頁頂圖（`{pageKey}.hero.band`，docs/15 §10）。
 * 它原本放在「頁面內容」裡，結果那裡點進去只有一張圖，條目本身卻在側欄另一個項目 ——
 * 編輯者找銷售據點的地址，進錯地方就以為「沒有欄位可以填」。
 * 依 docs/15 §7「一個單元在它露出的地方維護」，搬到這裡（docs/15 §15）。
 * </p>
 *
 * <p>
 * 圖是所有語系共用的（schema 標了 `x-localeInvariant`），所以這裡沒有語系分頁：
 * 存一個語系並請後端同步到其他語系。**「改回預設」是把這個區段的各語系內容整列刪掉**，
 * 前台取不到 `url` 就退回品牌圖樣（`apps/web/lib/bands.ts`）。
 * </p>
 */
export type PageBand = {
  pageKey: string;
  /** 一個畫面管兩頁時（文章 = 最新消息＋專欄）才需要，用來區分是哪一頁的圖 */
  label?: string;
  path: string;
};

const SECTION = 'hero';
const PRESET = 'page-band';

export function PageBandPanel({ bands }: { bands: PageBand[] }) {
  const pages = useQueries({
    queries: bands.map((b) => ({ queryKey: ['page', b.pageKey], queryFn: () => api.page(b.pageKey) })),
  });

  // 與 PageEdit 同一把 key —— 兩邊都只要 id → url 的對照
  const mediaUrls = useQuery({
    queryKey: ['media-all'],
    queryFn: () => api.media({}),
    staleTime: 60_000,
    select: (items) => Object.fromEntries(items.map((m) => [m.id, m.url])),
  });

  const [editing, setEditing] = useState<PageBand | null>(null);

  return (
    <section className="panel mb-4" aria-label="頁頂圖">
      {bands.map((band, i) => {
        const page = pages[i]?.data;
        const id = bandId(page);
        const url = id ? mediaUrls.data?.[id] : undefined;

        return (
          <div
            key={band.pageKey}
            className="flex flex-wrap items-center gap-4 px-4 py-3"
            style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
          >
            {/* 縮圖用前台的真實比例 16:3 —— 方形縮圖看不出這是一條橫幅 */}
            <span
              className="block aspect-[16/3] w-48 shrink-0 overflow-hidden rounded-sm"
              style={{
                background: url ? 'var(--bg-elevated)' : undefined,
                border: url ? undefined : '1px dashed var(--border-bright)',
              }}
            >
              {url && <img src={url} alt="" className="h-full w-full object-cover" />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[0.88rem] font-medium">{band.label ?? '頁頂圖'}</p>
              <p className="form-hint mt-0.5">
                前台 <span className="mono">{band.path}</span> 最上方那條橫幅，中英文共用。
                {!pages[i]?.isPending && !id && ' 目前顯示品牌預設圖樣。'}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={pages[i]?.isPending}
              onClick={() => setEditing(band)}
            >
              {id ? '更換圖片' : '設定圖片'}
            </button>
          </div>
        );
      })}

      {editing && (
        <BandDialog
          band={editing}
          page={pages[bands.indexOf(editing)]?.data}
          url={(id: string) => mediaUrls.data?.[id]}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function BandDialog({
  band,
  page,
  url,
  onClose,
}: {
  band: PageBand;
  page: AdminPage | undefined;
  url: (id: string) => string | undefined;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const original = bandId(page);
  const [picked, setPicked] = useState<MediaItem | null>(null);
  const [value, setValue] = useState<string | null>(original);
  const [error, setError] = useState<string | null>(null);

  const section = page?.sections.find((s) => s.sectionKey === SECTION);

  const save = useMutation({
    mutationFn: async () => {
      if (value) {
        // 存在既有的語系上（沒有就存中文），後端把圖同步到其他語系
        const locale = section?.translations['zh-TW'] ? 'zh-TW' : (Object.keys(section?.translations ?? {})[0] ?? 'zh-TW');
        const data = await commitStagedMedia({ ...(section?.translations[locale] ?? {}), band: value });
        await api.saveSection(band.pageKey, SECTION, { locale, data, syncInvariantFields: true });
      } else {
        // 改回預設：這個區段只有 band 一個欄位，各語系整列刪掉即可
        for (const locale of Object.keys(section?.translations ?? {})) {
          await api.deleteSectionLocale(band.pageKey, SECTION, locale);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page', band.pageKey] });
      queryClient.invalidateQueries({ queryKey: ['media-all'] });
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  return (
    <Dialog
      title={band.label ?? '頁頂圖'}
      onClose={() => {
        if (value !== original) discardStaged(value);
        onClose();
      }}
      footer={
        <DialogActions
          error={error}
          saving={save.isPending}
          disabled={value === original}
          onSave={() => save.mutate()}
        />
      }
    >
      <Field
        label="圖片"
        hint={`顯示在前台 ${band.path} 最上方，中英文共用。移除後儲存，會改回品牌預設圖樣。`}
      >
        <ImageField
          presetKey={PRESET}
          mediaId={value}
          url={value ? (picked?.id === value ? picked.url : url(value)) : null}
          onChange={(media) => {
            setPicked(media);
            setValue(media?.id ?? null);
          }}
        />
      </Field>
    </Dialog>
  );
}

function bandId(page: AdminPage | undefined): string | null {
  const section = page?.sections.find((s) => s.sectionKey === SECTION);
  if (!section) return null;
  for (const data of Object.values(section.translations)) {
    const v = data.band;
    if (typeof v === 'string' && v) return v;
  }
  return null;
}
