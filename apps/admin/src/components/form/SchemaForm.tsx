import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { emptyValue, fieldLabel, type SchemaNode } from '@/lib/schema';
import { Field } from './Field';
import { RichText, type RichTextProfile } from './RichText';
import { ImageField } from '../MediaField';
import { Icon } from '../Icon';

/**
 * 由 JSON Schema 生成的表單（docs/03 §8：`x-fieldType` 對應元件）。
 *
 * <p>
 * 18 個頁面共 60 個區段，欄位形狀全部寫在 `Api/PageSchemas/`。
 * 逐頁手寫表單的話，每加一個區段就要改前端 —— 而區段是內容規格，會一直調整。
 * </p>
 *
 * <p>
 * ⚠️ **未知的 `x-fieldType` 要明顯地壞掉**，不能靜默略過。
 * 這個專案已經被「schema 宣告了但沒人處理」咬過兩次；
 * 表單少畫一個欄位，編輯者只會以為那個欄位不存在。
 * </p>
 */
export function SchemaForm({
  schema,
  value,
  onChange,
  mediaUrls,
  onPickMedia,
  richTextProfile = 'section',
}: {
  schema: SchemaNode;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** mediaId → url，用來顯示已選圖片的縮圖 */
  mediaUrls: Record<string, string>;
  onPickMedia: (media: { id: string; url: string }) => void;
  /**
   * 富文字的淨化 profile。伺服器對 `privacy` 這一頁用 Legal（多了 h2/h3），
   * 其餘區段用 Section（`PageHandler.cs`）—— 工具列要跟著變，
   * 否則編輯者會看到一顆按了會被靜默剝掉的按鈕。
   */
  richTextProfile?: RichTextProfile;
}) {
  const required = new Set(schema.required ?? []);

  return (
    <>
      {Object.entries(schema.properties ?? {}).map(([name, node]) => (
        <SchemaField
          key={name}
          name={name}
          node={node}
          required={required.has(name)}
          value={value[name]}
          onChange={(v) => onChange({ ...value, [name]: v })}
          mediaUrls={mediaUrls}
          onPickMedia={onPickMedia}
          richTextProfile={richTextProfile}
        />
      ))}
    </>
  );
}

function SchemaField({
  name,
  node,
  required,
  value,
  onChange,
  mediaUrls,
  onPickMedia,
  richTextProfile,
}: {
  name: string;
  node: SchemaNode;
  required: boolean;
  value: unknown;
  onChange: (next: unknown) => void;
  mediaUrls: Record<string, string>;
  onPickMedia: (media: { id: string; url: string }) => void;
  richTextProfile: RichTextProfile;
}) {
  const label = fieldLabel(name);
  const type = node['x-fieldType'];

  // 跨語系同步的欄位：改一邊等於改兩邊。不標出來的話，
  // 編輯者會在英文頁改了圖，然後困惑中文頁的圖為什麼也變了。
  const hint = node['x-localeInvariant']
    ? '這個欄位所有語系共用，改動會同時套用到另一個語系。'
    : undefined;

  switch (type) {
    case 'media':
      return (
        <Field label={label} hint={hint} required={required}>
          <ImageField
            presetKey={node['x-mediaPreset'] ?? 'square'}
            mediaId={(value as string) || null}
            url={value ? mediaUrls[value as string] : null}
            onChange={(media) => {
              if (media) onPickMedia(media);
              onChange(media?.id ?? '');
            }}
          />
        </Field>
      );

    case 'richtext':
      return (
        <Field
          label={label}
          required={required}
          hint={hint ?? '存檔時伺服器仍會以白名單淨化 —— 工具列提供的就是允許的範圍。'}
        >
          <RichText
            value={value as string}
            profile={richTextProfile}
            onChange={(html) => onChange(html)}
          />
        </Field>
      );

    case 'bool':
      return (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-[0.9rem]">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            {label}
          </label>
          {hint && <p className="form-hint">{hint}</p>}
        </div>
      );

    case 'number':
      return (
        <Field label={label} hint={hint} required={required}>
          <input
            type="number"
            className="form-control mono"
            min={node.minimum}
            max={node.maximum}
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </Field>
      );

    case 'date':
      return (
        <Field label={label} hint={hint} required={required}>
          <input
            type="date"
            className="form-control"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );

    case 'enum':
      return (
        <Field label={label} hint={hint} required={required}>
          <select
            className="form-control"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">（未選擇）</option>
            {(node.enum ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      );

    case 'ref':
      return (
        <RefField
          label={label}
          entity={node['x-refEntity'] ?? ''}
          value={(value as string) ?? ''}
          onChange={onChange}
          required={required}
        />
      );

    case 'link':
      return (
        <fieldset className="panel mb-4 p-3">
          <legend className="form-label px-1">{label}</legend>
          <SchemaForm
            schema={node}
            value={(value as Record<string, unknown>) ?? {}}
            onChange={onChange as (v: Record<string, unknown>) => void}
            mediaUrls={mediaUrls}
            onPickMedia={onPickMedia}
          />
        </fieldset>
      );

    case 'repeatable':
      return (
        <RepeatableField
          label={label}
          node={node}
          value={(value as unknown[]) ?? []}
          onChange={onChange}
          mediaUrls={mediaUrls}
          onPickMedia={onPickMedia}
        />
      );

    case 'text': {
      // 長欄位給多行。分界取 200 —— 標題類都在這以下，前言與說明都在以上
      const long = (node.maxLength ?? 0) > 200;
      return (
        <Field label={label} hint={hint} required={required}>
          {long ? (
            <textarea
              className="form-control"
              rows={3}
              maxLength={node.maxLength}
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              className="form-control"
              maxLength={node.maxLength}
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
    }

    default:
      break;
  }

  // 沒有 x-fieldType 但是物件 —— 例如 about.testimonial 的 attribution
  if (node.type === 'object' && node.properties) {
    return (
      <fieldset className="panel mb-4 p-3">
        <legend className="form-label px-1">{label}</legend>
        <SchemaForm
          schema={node}
          value={(value as Record<string, unknown>) ?? {}}
          onChange={onChange as (v: Record<string, unknown>) => void}
          mediaUrls={mediaUrls}
          onPickMedia={onPickMedia}
        />
      </fieldset>
    );
  }

  // 明顯地壞掉，不要靜默略過 —— 少畫一個欄位，編輯者只會以為它不存在
  return (
    <p className="alert mb-4">
      欄位「{name}」的型別 <span className="mono">{type ?? node.type ?? '未知'}</span>{' '}
      尚未支援。請補 SchemaForm 的對應元件。
    </p>
  );
}

/** `x-refEntity` 的下拉。目前解析器支援 Certification / Article / Download。 */
function RefField({
  label,
  entity,
  value,
  onChange,
  required,
}: {
  label: string;
  entity: string;
  value: string;
  onChange: (next: unknown) => void;
  required: boolean;
}) {
  const { data } = useQuery({
    queryKey: ['ref', entity],
    queryFn: async () => {
      if (entity === 'Certification')
        return (await api.certifications()).map((c) => ({ id: c.slug, label: c.mark }));
      if (entity === 'Download')
        return (await api.downloads()).map((d) => ({
          id: d.id,
          label: d.translations['zh-TW']?.title ?? d.translations.en?.title ?? d.id,
        }));
      if (entity === 'Article')
        return (await api.articles({ pageSize: '100' })).items.map((a) => ({
          id: a.slug,
          label: a.titleZhTw ?? a.titleEn ?? a.slug,
        }));
      return [];
    },
    staleTime: 5 * 60_000,
  });

  return (
    <Field
      label={label}
      required={required}
      hint={
        entity === 'Download'
          ? '下載項目沒有網址代稱，這裡存的是它的 ID。'
          : undefined
      }
    >
      <select className="form-control" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">（未選擇）</option>
        {(data ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function RepeatableField({
  label,
  node,
  value,
  onChange,
  mediaUrls,
  onPickMedia,
}: {
  label: string;
  node: SchemaNode;
  value: unknown[];
  onChange: (next: unknown) => void;
  mediaUrls: Record<string, string>;
  onPickMedia: (media: { id: string; url: string }) => void;
}) {
  const min = node.minItems ?? 0;
  const max = node.maxItems ?? 20;
  const item = node.items;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = value.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="form-label mb-0">{label}</span>
        <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
          {value.length} / {max}
        </span>
      </div>

      {value.map((entry, i) => (
        <div key={i} className="panel mb-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                aria-label={`${label} 第 ${i + 1} 項上移`}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={i === value.length - 1}
                onClick={() => move(i, i + 1)}
                aria-label={`${label} 第 ${i + 1} 項下移`}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                disabled={value.length <= min}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`刪除 ${label} 第 ${i + 1} 項`}
              >
                ✕
              </button>
            </span>
          </div>

          {item?.properties ? (
            <SchemaForm
              schema={item}
              value={(entry as Record<string, unknown>) ?? {}}
              onChange={(next) => onChange(value.map((e, j) => (j === i ? next : e)))}
              mediaUrls={mediaUrls}
              onPickMedia={onPickMedia}
            />
          ) : (
            <input
              className="form-control"
              value={(entry as string) ?? ''}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
            />
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-sm btn-secondary"
        disabled={value.length >= max}
        onClick={() => onChange([...value, item ? emptyValue(item) : ''])}
      >
        <Icon name="plus" className="icon icon-sm" />
        新增{label}
      </button>

      {value.length < min && (
        <p className="form-hint" style={{ color: 'var(--red)' }}>
          至少需要 {min} 項，未達數量無法儲存。
        </p>
      )}
    </div>
  );
}
