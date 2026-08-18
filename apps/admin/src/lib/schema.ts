/**
 * 後端 JSON Schema 的子集 —— 只涵蓋 `Api/PageSchemas/` 實際用到的關鍵字。
 *
 * <p>
 * **`x-` 自訂關鍵字全部都要有對應的處理**。這個專案已經因為
 * 「schema 宣告了但沒人執行」被咬過兩次（`x-mediaPreset` 沒驗、
 * `x-refEntity` 的 Article/Download 沒解析，見 docs/13 的踩坑）。
 * 加新的欄位型別時，這裡與 `SchemaForm` 要一起改。
 * </p>
 */
export type FieldType =
  | 'text'
  | 'richtext'
  | 'media'
  | 'link'
  | 'repeatable'
  | 'ref'
  | 'enum'
  | 'bool'
  | 'number'
  | 'date';

export type SchemaNode = {
  type?: string;
  title?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  enum?: string[];
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  format?: string;
  'x-fieldType'?: FieldType;
  'x-mediaPreset'?: string;
  'x-refEntity'?: string;
  'x-localeInvariant'?: boolean;
};

export type PageSchema = { key: string; sections: Record<string, SchemaNode> };

/** 區段標題去掉頁面前綴：「About · 05 Certified…」→「05 Certified…」 */
export function sectionTitle(schema: SchemaNode | undefined, fallback: string): string {
  const title = schema?.title;
  if (!title) return fallback;
  const parts = title.split('·');
  return (parts.length > 1 ? parts.slice(1).join('·') : title).trim();
}

/**
 * 欄位標籤。schema 沒有逐欄位的中文名稱 —— 用屬性名轉成可讀的字串。
 * 常見欄位給一份對照表，其餘退回把 camelCase 拆開。
 */
const LABELS: Record<string, string> = {
  title: '標題',
  lead: '前言',
  body: '內文',
  eyebrow: '小標',
  band: '頁首橫幅',
  background: '背景圖',
  portrait: '直式照片',
  image: '圖片',
  imageWide: '橫式照片',
  imageSquare: '方形照片',
  items: '項目',
  slides: '輪播',
  tiles: '格子',
  steps: '步驟',
  points: '重點',
  chips: '標籤',
  cta: '行動按鈕',
  allLink: '看全部連結',
  link: '連結',
  label: '文字',
  url: '網址',
  external: '外部連結',
  icon: '圖示',
  subtitle: '副標',
  ctaLabel: '按鈕文字',
  quote: '引言',
  source: '出處',
  attribution: '署名',
  name: '名稱',
  region: '地區',
  miniQuotes: '短引言',
  video: '影片',
  poster: '影片封面',
  floatingChip: '浮動標籤',
  mode: '模式',
  year: '年份',
  event: '事件',
  certification: '認證',
  article: '文章',
  download: '檔案',
  lastUpdated: '最後更新日',
  intervalSeconds: '輪播間隔（秒）',
  formTitle: '表單標題',
  formIntro: '表單說明',
  partnershipTypes: '合作類型',
  submitLabel: '送出按鈕文字',
  promo: '促購卡',
  measureLabel: '量測部位',
  footnote: '附註',
};

export function fieldLabel(name: string): string {
  return LABELS[name] ?? name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

/** 依 schema 建一個空值，讓 repeater 新增項目時形狀正確。 */
export function emptyValue(node: SchemaNode): unknown {
  switch (node['x-fieldType']) {
    case 'bool':
      return false;
    case 'number':
      return node.default ?? node.minimum ?? 0;
    case 'repeatable':
      return [];
    default:
      break;
  }

  if (node.type === 'object') {
    return Object.fromEntries(
      Object.entries(node.properties ?? {}).map(([k, v]) => [k, emptyValue(v)]),
    );
  }
  if (node.type === 'array') return [];
  return '';
}
