import type { ArticleDetail, Faq, ProductDetail, SalesLocations } from './api';
import { COMPANY, COMPANY_LOCALIZED, OPENING_HOURS } from './company';
import type { Locale } from './locale';
import { absoluteUrl, BRAND_LOGO_URL, SITE_URL, toAbsolute } from './site';

/**
 * JSON-LD 結構化資料（docs/06 §6）。
 *
 * <p>
 * **這裡只組物件，不負責輸出** —— 輸出交給 `components/JsonLd.tsx`，
 * 這樣每一段 schema 都能單獨在 Rich Results 測試工具裡貼上驗證。
 * </p>
 *
 * <p>
 * ⚠️ **醫療宣稱**：這些節點的文字全部來自 CMS 既有欄位（產品敘述、FAQ 答案），
 * 不在這裡另外造句。結構化資料會被搜尋引擎與 AI 逐字引用，
 * 自行改寫等於繞過內容端的法規審閱（docs/06 §6 註）。
 * </p>
 */
export type JsonLdNode = Record<string, unknown>;

/** 全站共用的 Organization 節點 id。其他 schema 一律以 `@id` 指回這裡，不重複展開。 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const BRAND = 'EuniceMed';

/** 品牌標語是品牌符號，不隨語系翻譯（docs/08 §5.2 的例外清單）。 */
const SLOGAN = 'Not Just a Motion — enhancing your quality of life';

/**
 * 全站的 Organization。放在 `[locale]/layout.tsx`，每一頁都有。
 *
 * <p>
 * `sameAs` 目前只有 LinkedIn，而那個網址在 `lib/company.ts` 標註為**推定值**。
 * 它已經印在 footer 上，所以這裡不是新的曝露；但品牌方給出正式網址前，
 * 這一條同樣屬於待確認項目。
 * </p>
 */
export function organizationSchema(locale: Locale): JsonLdNode {
  const { postal } = COMPANY_LOCALIZED[locale];

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: BRAND,
    slogan: SLOGAN,
    url: absoluteUrl(locale),
    logo: BRAND_LOGO_URL,
    email: COMPANY.email,
    telephone: COMPANY.phone,
    address: { '@type': 'PostalAddress', ...postal },
    // 母公司：康得適 Comfort Plus Corporation（CLAUDE.md §1）
    parentOrganization: { '@type': 'Organization', name: 'Comfort Plus Corporation' },
    sameAs: [COMPANY.linkedIn],
  };
}

/**
 * 麵包屑。最後一項是目前這一頁，照 Google 的規範仍要列出，
 * 但**可以不帶 `item`** —— 元件手上沒有自己的網址，與其在每個呼叫端重算一次，
 * 不如用規範允許的省略寫法。
 */
export function breadcrumbSchema(items: { name: string; url?: string }[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: toAbsolute(item.url) } : {}),
    })),
  };
}

/**
 * 產品。
 *
 * <p>
 * **沒有 `offers`** —— 本站不是電商，沒有價格也沒有庫存（CLAUDE.md §1）。
 * Google 會在測試工具裡提示缺這一欄，那是預期的：捏造價格才是真的錯。
 * </p>
 */
export function productSchema(
  locale: Locale,
  product: ProductDetail,
  path: string,
): JsonLdNode {
  const specs = (product.specs ?? [])
    .filter((s) => s.label && s.value)
    .map((s) => ({ '@type': 'PropertyValue', name: s.label, value: s.value }));

  return prune({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku ?? undefined,
    description: product.summary ?? product.seo.description ?? undefined,
    image: product.images.map((img) => toAbsolute(img.url)),
    brand: { '@type': 'Brand', name: BRAND },
    manufacturer: { '@id': ORGANIZATION_ID },
    category: [product.category?.name, product.subCategory?.name]
      .filter(Boolean)
      .join(' > ') || undefined,
    url: absoluteUrl(locale, path),
    inLanguage: locale,
    additionalProperty: specs.length > 0 ? specs : undefined,
  });
}

/** News 用 `NewsArticle`、Insights 用 `Article`；兩者的必填欄位相同。 */
export function articleSchema(
  locale: Locale,
  article: ArticleDetail,
  path: string,
  kind: 'news' | 'insights',
): JsonLdNode {
  const url = absoluteUrl(locale, path);

  return prune({
    '@context': 'https://schema.org',
    '@type': kind === 'news' ? 'NewsArticle' : 'Article',
    // Google 建議 headline 不超過 110 字元，過長會整段被忽略
    headline: article.title.slice(0, 110),
    description: article.excerpt ?? article.standfirst ?? undefined,
    image: article.cover ? [toAbsolute(article.cover.url)] : undefined,
    datePublished: article.publishedAt ?? undefined,
    // 掛名作者是人，沒填就掛品牌本身
    author: article.author
      ? { '@type': 'Person', name: article.author }
      : { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: article.category?.name ?? undefined,
    inLanguage: locale,
  });
}

/**
 * FAQ。答案帶的是 API 已淨化過的 HTML（`Services/HtmlSanitizers.cs`）——
 * Google 的 FAQPage 允許答案含有限的 HTML，所以保留清單與連結的結構。
 */
export function faqPageSchema(locale: Locale, faqs: Faq[]): JsonLdNode | null {
  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/**
 * 聯絡頁。`ContactPoint.hoursAvailable` 是營業時間的正確掛法 ——
 * `openingHoursSpecification` 屬於 Place，而這裡描述的是「怎麼找到我們」而非門市。
 */
export function contactPageSchema(locale: Locale, path: string): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    url: absoluteUrl(locale, path),
    inLanguage: locale,
    mainEntity: {
      '@id': ORGANIZATION_ID,
      '@type': 'Organization',
      name: BRAND,
      address: { '@type': 'PostalAddress', ...COMPANY_LOCALIZED[locale].postal },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: COMPANY.phone,
        email: COMPANY.email,
        availableLanguage: ['en', 'zh-Hant'],
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [...OPENING_HOURS.days],
          opens: OPENING_HOURS.opens,
          closes: OPENING_HOURS.closes,
        },
      },
    },
  };
}

/**
 * 銷售據點。經銷商是**別家公司**，所以每一筆是獨立的 `Organization`，
 * 不掛 `@id` 也不宣稱屬於本品牌 —— 只說「這裡買得到」。
 */
export function salesLocationsSchema(
  locale: Locale,
  data: SalesLocations,
  path: string,
): JsonLdNode | null {
  const all = [...data.domestic, ...data.international.flatMap((g) => g.items)];
  if (all.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: BRAND,
    url: absoluteUrl(locale, path),
    numberOfItems: all.length,
    itemListElement: all.map((loc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: prune({
        '@type': 'Organization',
        name: loc.name,
        address: loc.address
          ? { '@type': 'PostalAddress', streetAddress: loc.address, addressCountry: loc.countryCode }
          : { '@type': 'PostalAddress', addressCountry: loc.countryCode },
        telephone: loc.phone ?? undefined,
        url: loc.websiteUrl ?? undefined,
      }),
    })),
  };
}

/** 去掉值為 undefined／空陣列的欄位 —— JSON-LD 裡的空欄位會被驗證工具當成錯誤。 */
function prune(node: JsonLdNode): JsonLdNode {
  return Object.fromEntries(
    Object.entries(node).filter(
      ([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0),
    ),
  );
}
