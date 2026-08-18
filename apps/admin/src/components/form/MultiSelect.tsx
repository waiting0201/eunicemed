/**
 * 多選（適用部位、認證、標籤）。
 *
 * <p>
 * 用可勾選的 chip 而非 `<select multiple>`：後者在 macOS 上要按住 ⌘ 才能複選，
 * 是每個人都會踩一次的互動。選項通常只有 5–7 個，全部攤開反而快。
 * </p>
 */
export function MultiSelect<T>({
  label,
  options,
  selected,
  onChange,
  keyOf,
  labelOf,
  hint,
}: {
  label: string;
  options: T[];
  selected: string[];
  onChange: (next: string[]) => void;
  keyOf: (option: T) => string;
  labelOf: (option: T) => string;
  hint?: string;
}) {
  if (options.length === 0) return null;

  return (
    <div className="mb-4">
      <span className="form-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const id = keyOf(option);
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? selected.filter((x) => x !== id) : [...selected, id])
              }
              className={`btn btn-sm ${on ? 'btn-primary' : 'btn-secondary'}`}
            >
              {labelOf(option)}
            </button>
          );
        })}
      </div>
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}
