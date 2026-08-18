import { Suspense, lazy } from 'react';

/**
 * 富文字欄位。與伺服器的三個淨化 profile 一一對應
 * （`Api/Services/HtmlSanitizers.cs` 的 `RichTextProfile`）——
 * 名字刻意相同，改白名單時兩邊才會一起被看到。
 *
 * <p>
 * TipTap 走 `lazy()`：ProseMirror 那一整包只在真的有富文字欄位的畫面才下載。
 * 後台與公開站共用 SWA Free 的 250MB 上限（CLAUDE.md §5.2a）。
 * </p>
 */
export type RichTextProfile = 'section' | 'article' | 'legal';

const Editor = lazy(() => import('./RichTextEditor'));

export function RichText({
  value,
  profile = 'section',
  onChange,
}: {
  value: string | null | undefined;
  profile?: RichTextProfile;
  onChange: (html: string) => void;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="form-control flex items-center"
          style={{ minHeight: '8rem', color: 'var(--text-muted)' }}
        >
          編輯器載入中…
        </div>
      }
    >
      <Editor value={value ?? ''} profile={profile} onChange={onChange} />
    </Suspense>
  );
}
