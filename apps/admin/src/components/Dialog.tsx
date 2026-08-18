import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 編輯對話框。
 *
 * <p>
 * 內容量小的模組（FAQ、下載、據點、分類）用對話框而不是獨立編輯頁：
 * 它們的欄位少，離開列表再回來反而失去掃視位置。
 * 產品與文章欄位多，仍走獨立頁面。
 * </p>
 *
 * Esc 關閉、開啟時焦點移入、關閉後焦點回到原本的觸發元素 ——
 * 鍵盤使用者不會被丟到頁面最上方。
 */
export function Dialog({
  title,
  width = '38rem',
  onClose,
  children,
  footer,
}: {
  title: ReactNode;
  width?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className="panel my-auto max-h-[88vh] overflow-y-auto outline-none"
        style={{ width: `min(${width}, 92vw)` }}
      >
        <div className="panel-header sticky top-0 z-10">
          <h2 className="text-[0.95rem] font-semibold">{title}</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            關閉
          </button>
        </div>

        <div className="panel-body">{children}</div>

        {footer && (
          <div className="panel-footer flex items-center justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** 存檔列的標準組合：左邊放刪除等破壞性動作，右邊放主要動作。 */
export function DialogActions({
  danger,
  error,
  onSave,
  saving,
  disabled,
}: {
  danger?: ReactNode;
  error?: string | null;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      {danger}
      {error && (
        <p role="alert" className="alert mr-auto my-0 py-1">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        disabled={saving || disabled}
        onClick={onSave}
      >
        {saving ? '儲存中…' : '儲存'}
      </button>
    </>
  );
}
