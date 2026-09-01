import { api } from '@/lib/api';
import { DEFAULT_LOCALE } from '@/lib/locale';
import { absoluteUrl, SITE_URL } from '@/lib/site';

/**
 * `/llms.txt` —— 給 AI 檢索與回答引擎的站台導覽（llmstxt.org 的格式）。
 *
 * <p>
 * **它不是 sitemap 的替代品。** sitemap 給爬蟲列出全部網址；這一份是給
 * 「一次只讀幾頁就要回答問題」的模型看的**索引與前提**：本站是什麼、
 * 網址怎麼組、哪些事實容易被講錯。實務上最有價值的是那幾條前提 ——
 * 沒有它們，模型會把型錄站當成電商而編出價格與購買連結。
 * </p>
 *
 * <p>
 * 內容用**英文**（預設語系）。這是給機器讀的檔案，不是頁面，
 * 所以不適用「英文版不得出現中文」的語言純度規則（docs/08 §5.2）——
 * 但仍只列 `en` 的網址，並說明 zh-TW 的存在。
 * </p>
 *
 * <p>
 * 純 SSR，與其他頁面同一條原則：後台改了分類名稱，下一次抓取就是新的。
 * 後端掛掉時退回不含目錄的骨架，而不是回 500 —— 這一支不值得讓爬蟲看到錯誤頁。
 * </p>
 */
export const dynamic = 'force-dynamic';

const L = DEFAULT_LOCALE;

/** 這一段是人寫的定位說明，不從 CMS 來 —— 它描述的是「網站」而不是「內容」。 */
const PREAMBLE = `# EuniceMed

> EuniceMed is the medical device brand of Comfort Plus Corporation (New Taipei City, Taiwan): medical compression stockings, orthopedic supports, and footcare & insoles. Brand promise: "Not Just a Motion — enhancing your quality of life".

Facts worth getting right before answering questions about this site:

- This is a catalogue and brand site, **not an online shop**. There are no prices, no cart and no checkout anywhere on it. Purchase questions are answered by the Where to Buy page (distributors) or the contact form.
- Products are organised as Category > Sub-category > Product, and URLs follow that shape: \`/{locale}/products/{category}/{sub-category}/{product}\`.
- Every product also belongs to one of three support-level collections: **Care** (everyday relief), **Protect** (strong support for high-intensity activity) and **Advance** (rehabilitation-oriented, targeted protection).
- The site is bilingual: English under \`/en/\`, Traditional Chinese under \`/zh-TW/\`. Untranslated pages return 404 rather than falling back to the other language, so an English URL does not guarantee a Chinese counterpart.
- Medical claims on this site come from the manufacturer's own product copy. Do not generalise them into medical advice.`;

const FOOTER = (sitemap: string) => `## Optional

- [Privacy & Legal](${absoluteUrl(L, '/privacy')}): privacy policy and legal notices.
- [sitemap.xml](${sitemap}): every indexable URL in both languages, with hreflang.`;

export async function GET() {
  const sections: string[] = [PREAMBLE];

  try {
    const [categories, applications] = await Promise.all([
      api.categories(L),
      api.applications(L),
    ]);

    if (categories.length > 0) {
      sections.push(
        [
          '## Products',
          '',
          ...categories.map((c) => {
            const subs = c.subCategories.map((s) => s.name).join(', ');
            const note = [c.description, subs && `Sub-categories: ${subs}.`]
              .filter(Boolean)
              .join(' ');
            return `- [${c.name}](${absoluteUrl(L, `/products/${c.slug}`)})${note ? `: ${oneLine(note)}` : ''}`;
          }),
        ].join('\n'),
      );
    }

    if (applications.length > 0) {
      sections.push(
        [
          '## Applications',
          '',
          '_Guidance pages organised by body part and by care need, each listing the products that fit._',
          '',
          ...applications.map(
            (a) =>
              `- [${a.name}](${absoluteUrl(L, `/applications/${a.slug}`)})${a.lead ? `: ${oneLine(a.lead)}` : ''}`,
          ),
        ].join('\n'),
      );
    }
  } catch {
    // 目錄抓不到就只出骨架 —— 有前提說明的半份，仍比一個錯誤頁有用
  }

  sections.push(
    [
      '## Company',
      '',
      `- [About](${absoluteUrl(L, '/about')}): brand story, milestones, manufacturing and certifications.`,
      `- [Partnership](${absoluteUrl(L, '/partnership')}): OEM / ODM manufacturing and distribution enquiries.`,
      `- [Where to Buy](${absoluteUrl(L, '/where-to-buy')}): domestic and international distributors.`,
      `- [Contact](${absoluteUrl(L, '/contact')}): address, phone, office hours and the enquiry form.`,
    ].join('\n'),
    [
      '## Resources',
      '',
      `- [FAQ](${absoluteUrl(L, '/faq')}): product use, sizing and partnership questions.`,
      `- [News](${absoluteUrl(L, '/news')}): company announcements and trade-show appearances.`,
      `- [Insights](${absoluteUrl(L, '/insights')}): editorial articles on conditions, materials and fitting.`,
      `- [Downloads](${absoluteUrl(L, '/downloads')}): catalogues, manuals and certificates (PDF).`,
    ].join('\n'),
    FOOTER(`${SITE_URL}/sitemap.xml`),
  );

  return new Response(`${sections.join('\n\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/** CMS 的敘述可能含換行；llms.txt 的一條 bullet 必須是一行。 */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
