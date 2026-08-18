import type { ReactNode } from 'react';

/**
 * 表單欄位外框。標籤、說明、錯誤訊息的位置在整個後台一致。
 *
 * <p>
 * `hint` 的用途之一是**上傳尺寸提示**（docs/03 §5 的全域規則）——
 * 文字來自 `GET /admin/media-presets`，不在各畫面寫死。
 * </p>
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="form-label">
        {label}
        {required && (
          <span aria-hidden style={{ color: 'var(--red)' }}>
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && (
        <p className="form-hint" style={{ color: 'var(--red)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** 一列並排的欄位。窄欄位（slug + SKU）擠在一起比各佔一整列好掃視。 */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-4 sm:grid-cols-2">{children}</div>;
}
