import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type MediaRef } from '@/lib/api';
import { css } from '@/lib/css';
import { srcSetOf } from '@/lib/image';
import { isLocale, type Locale } from '@/lib/locale';
import { section, type CertificationRef, type SectionCta } from '@/lib/page';
import { PageBand } from '@/components/PageBand';
import { PageHero } from '@/components/PageHero';
import { NUMERAL, SectionHeading } from '@/components/SectionHeading';

/** 樣式逐字取自 `mockup4/About.dc.html`。 */
const S = {
  // 01 BRAND STORY
  s01: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s01Grid: css`display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;`,
  h2: css`color:#16333B;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 18px;`,
  storyLead: css`font-size:1.05rem;margin-bottom:16px;`,
  portrait: css`aspect-ratio:4/5;border-radius:22px;overflow:hidden;box-shadow:0 30px 60px rgba(10,60,72,.16);`,
  portraitImg: css`display:block;width:100%;height:100%;object-fit:cover;object-position:top center;`,

  // 02 MILESTONES
  s02: css`position:relative;overflow:hidden;color:#fff;padding:clamp(72px,9vw,110px) 0;`,
  s02Img: css`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 25%;`,
  s02Scrim: css`position:absolute;inset:0;background:linear-gradient(90deg,rgba(9,36,45,.74) 0%,rgba(9,36,45,.5) 52%,rgba(9,36,45,.14) 100%);`,
  s02Inner: css`position:relative;max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  s02Title: css`color:#fff;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 44px;`,
  s02Grid: css`display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:1px solid rgba(255,255,255,.16);`,
  s02Cell: css`padding:28px 24px 0;border-left:1px solid rgba(255,255,255,.16);`,
  s02Year: css`color:#7FE0EC;font-weight:680;font-size:1.6rem;letter-spacing:-.02em;`,
  s02Event: css`color:rgba(255,255,255,.78);margin-top:8px;font-size:.92rem;`,

  // 03 CORE VALUES
  s03: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px) 0;`,
  s03Title: css`color:#16333B;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 12px;`,
  // 「personal」的品牌青。文字用 #0092A8 而不是 #00B5CD —— 後者壓白底只有約 2.9:1（DESIGN.md）
  s03Accent: css`color:#0092A8;`,
  s03Lead: css`max-width:60ch;`,
  s03Grid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:36px;`,
  s03Card: css`border:1px solid #DFE9EC;border-radius:20px;padding:28px 26px;`,
  s03CardTitle: css`color:#16333B;font-weight:570;font-size:1.25rem;margin-bottom:8px;`,
  s03CardBody: css`font-size:.95rem;`,

  // 04 MANUFACTURING
  s04: css`max-width:1180px;margin:0 auto;padding:clamp(64px,8vw,96px) clamp(24px,5vw,64px);`,
  s04Title: css`color:#16333B;font-weight:400;font-size:clamp(1.9rem,3.6vw,2.5rem);margin:8px 0 36px;max-width:22ch;`,
  s04Shots: css`display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:40px;`,
  s04Wide: css`position:relative;aspect-ratio:16/9;border-radius:20px;overflow:hidden;background:#F0F6F8;`,
  s04Square: css`position:relative;aspect-ratio:1/1;border-radius:20px;overflow:hidden;background:#F0F6F8;`,
  s04Img: css`display:block;width:100%;height:100%;object-fit:cover;`,
  s04Grid: css`display:grid;grid-template-columns:repeat(3,1fr);gap:32px;`,
  s04Item: css`border-top:2px solid #00B5CD;padding-top:18px;`,
  s04ItemTitle: css`color:#16333B;font-weight:570;font-size:1.15rem;margin-bottom:6px;`,
  s04ItemBody: css`font-size:.92rem;`,

  // 05 CERTIFICATES
  s05: css`background:#F5FAFB;padding:clamp(64px,8vw,96px) 0;`,
  s05Inner: css`max-width:1180px;margin:0 auto;padding:0 clamp(24px,5vw,64px);`,
  s05Grid: css`display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(36px,5vw,72px);align-items:center;`,
  s05Lead: css`max-width:42ch;`,
  s05Cta: css`display:inline-block;margin-top:28px;background:#00B5CD;color:#fff;font-weight:620;padding:12px 28px;border-radius:999px;box-shadow:0 10px 30px rgba(0,181,205,.3);`,
  s05Cards: css`display:grid;grid-template-columns:1fr 1fr;gap:16px;`,
  s05Hero: css`grid-column:1 / 3;display:flex;align-items:center;gap:20px;background:linear-gradient(140deg,#00B5CD,#007D95);border-radius:18px;padding:24px 28px;`,
  s05HeroMark: css`color:#fff;font-weight:620;font-size:1.35rem;letter-spacing:-.01em;`,
  s05HeroBody: css`color:rgba(255,255,255,.85);font-size:.9rem;`,
  certSub: css`font-size:.82rem;color:#0092A8;`,
  certLogo: css`width:42px;height:42px;flex:0 0 auto;object-fit:contain;`,
  s05Card: css`background:#FFFFFF;border:1px solid #DFE9EC;border-radius:18px;padding:22px 24px;`,
  s05CardMark: css`color:#0092A8;font-weight:680;font-size:1.5rem;letter-spacing:-.01em;`,
  s05CardBody: css`font-size:.88rem;margin-top:6px;`,
} as const;

type Params = { locale: string };

/** About 整頁的區段標題字級（mockup4 這頁比其他頁大一階）。 */

/**
 * About。**全站第一個吃 `GET /pages/{key}` 的頁面** ——
 * 版面固定（照 mockup4），欄位內容全部由後台維護。
 *
 * <p>
 * 每個區段都可能不存在：未翻譯的區段 API 不回、停用的區段 `_enabled` 為 false。
 * 所以每一塊都是 `s && (...)`，且區段序號在渲染時才發 —— 與產品詳情頁同一套做法。
 * </p>
 */
type HeroSection = { band?: MediaRef };
type StorySection = { title?: string; body?: string; portrait?: MediaRef };
type MilestonesSection = {
  background?: MediaRef;
  items?: { year?: string; event?: string }[];
};
type ManufacturingSection = {
  imageWide?: MediaRef;
  imageSquare?: MediaRef;
  points?: { title?: string; body?: string }[];
};
type CertificatesSection = { items?: { certification?: string }[] };

/**
 * 版面文案 —— **刻意寫死，不走 CMS**（決議見 docs/15-cms-scope.md）。
 *
 * <p>
 * 頁首、三段區段標題與核心價值整段都是版型的一部分：改它要動的是 mockup4。
 * 留在 CMS 的是真的會換的東西 —— 品牌故事的內文、里程碑年份、廠區照、
 * 掛哪幾張認證。
 * </p>
 *
 * <p>
 * 英文逐字取自 `mockup4/About.dc.html`。`meta.title` 與 h1 分開：
 * h1 是 mockup4 的兩行標語，`<title>` 要的是能在搜尋結果與分頁上辨識的頁名。
 * </p>
 */
const COPY: Record<
  Locale,
  {
    meta: { title: string };
    hero: { eyebrow: string; title: [string, string]; lead: string };
    milestones: string;
    values: { title: string; accent: string; lead: string; items: { title: string; body: string }[] };
    manufacturing: string;
    certificates: { title: string; lead: string; cta: string };
  }
> = {
  en: {
    meta: { title: 'About' },
    hero: {
      eyebrow: 'About EuniceMed',
      title: ['Understood.', 'In good hands.'],
      lead:
        'We deliver clinically trusted, comfort-first medical supports — with the ' +
        'flexibility, service and precision your patients and business deserve.',
    },
    milestones: 'Steady growth. Deep roots.',
    values: {
      title: 'Support feels ',
      accent: 'personal',
      lead:
        'Everything we do is underpinned by three commitments — ' +
        'and you can feel them in the details.',
      items: [
        {
          title: 'Excellence',
          body:
            'Every product begins with a clear goal: real comfort and performance, without ' +
            "compromise. Excellence isn't just what we make — it's how we work.",
        },
        {
          title: 'Care',
          body:
            'Comfort-first design that supports movement rather than limiting it — ' +
            'because reassurance matters as much as function.',
        },
        {
          title: 'Partnership',
          body:
            'A dependable, service-first specialist — expert hands, caring hearts and ' +
            'lasting partnerships with professionals and distributors worldwide.',
        },
      ],
    },
    manufacturing: 'Manufacturing & quality excellence',
    certificates: {
      title: 'Certified, audited, trusted',
      lead:
        'Every EuniceMed product line is manufactured under an ISO 13485 quality system ' +
        'and independently certified for its market.',
      cta: 'Download certificates →',
    },
  },
  'zh-TW': {
    meta: { title: '關於我們' },
    hero: {
      eyebrow: '關於 EuniceMed',
      title: ['懂你的需要。', '交給我們，安心。'],
      lead:
        '我們提供臨床信賴、以舒適為先的醫療支撐產品 —— ' +
        '並以您的病患與事業應得的彈性、服務與精準度交付。',
    },
    milestones: '穩健成長，扎根深遠。',
    values: {
      title: '支撐，是很',
      accent: '個人的事',
      lead: '我們所做的一切都以三項承諾為本 —— 而你能在細節裡感受到它們。',
      items: [
        {
          title: '卓越',
          body:
            '每一件產品都始於一個明確的目標：真實的舒適與效能，不打折扣。' +
            '卓越不只是我們做出來的東西，更是我們做事的方式。',
        },
        {
          title: '關懷',
          body: '以舒適為先的設計，支撐動作而不是限制它 —— 因為安心與功能同樣重要。',
        },
        {
          title: '夥伴關係',
          body:
            '可靠、以服務為先的專業夥伴 —— 專業的雙手、關懷的心，' +
            '以及與全球醫療專業人員和經銷商的長期合作。',
        },
      ],
    },
    manufacturing: '製造與品質實力',
    certificates: {
      title: '通過認證，定期稽核，值得信賴',
      lead: '每一條 EuniceMed 產品線都在 ISO 13485 品質系統下生產，並依各市場取得獨立認證。',
      cta: '下載認證文件 →',
    },
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: COPY[locale].meta.title,
    description: COPY[locale].hero.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/about`,
      languages: { en: `${siteUrl}/en/about`, 'zh-TW': `${siteUrl}/zh-TW/about` },
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const page = await api.page(locale, 'about');
  // 整頁沒有任何該語系內容時回 404，而不是渲染一個空殼 —— 語言純度
  if (!page) notFound();

  const copy = COPY[locale];
  const hero = section<HeroSection>(page, 'hero');
  const story = section<StorySection>(page, 'story');
  const milestones = section<MilestonesSection>(page, 'milestones');
  const manufacturing = section<ManufacturingSection>(page, 'manufacturing');
  // 收斂後只剩 invariant 的引用清單，缺該語系的列時整段不回 ——
  // 所以 gate 在「有沒有標章」而不是「有沒有區段物件」（docs/15）
  const certItems = section<CertificatesSection>(page, 'certificates')?.items ?? [];

  let n = 0;
  const next = () => ++n;

  return (
    <>
      <PageBand image={hero?.band} />

      <PageHero
        eyebrow={copy.hero.eyebrow}
        title={
          <>
            {copy.hero.title[0]}
            <br />
            {copy.hero.title[1]}
          </>
        }
        lead={copy.hero.lead}
      />

      {/* 01 品牌故事 */}
      {story && (
        <section style={S.s01}>
          <div style={S.s01Grid}>
            <div>
              <SectionHeading index={next()} title={story.title ?? ''} titleStyle={S.h2} />
              {story.body && (
                <div
                  className="m4-prose"
                  // richtext 已在寫入時淨化（Section profile），前端不再處理
                  dangerouslySetInnerHTML={{ __html: story.body }}
                />
              )}
            </div>
            {story.portrait && (
              <img
                src={story.portrait.url}
                srcSet={srcSetOf(story.portrait)}
                sizes="(max-width: 1024px) 100vw, 480px"
                alt={story.portrait.alt ?? ''}
                width={1000}
                height={1250}
                decoding="async"
                style={{ ...S.portrait, ...S.portraitImg }}
              />
            )}
          </div>
        </section>
      )}

      {/* 02 里程碑 */}
      {milestones && (
        <section style={S.s02}>
          {milestones.background && (
            <>
              <img
                src={milestones.background.url}
                srcSet={srcSetOf(milestones.background)}
                sizes="100vw"
                alt=""
                loading="lazy"
                decoding="async"
                style={S.s02Img}
              />
              {/* 背景圖上要壓字，一定要有遮罩 —— 圖是編輯者換的，不能假設它夠暗 */}
              {/* 由左至右的深青遮罩：左側文字讀得到、右側照片保持乾淨（DESIGN.md） */}
              <div style={S.s02Scrim} />
            </>
          )}

          <div style={S.s02Inner}>
            <span style={NUMERAL.onPhoto}>{String(next()).padStart(2, '0')}</span>
            <h2 style={S.s02Title}>{copy.milestones}</h2>

            {milestones.items && milestones.items.length > 0 && (
              <div style={S.s02Grid} data-r="cols-2">
                {milestones.items.map((m, i) => (
                  <div key={m.year ?? i} style={S.s02Cell}>
                    <div style={S.s02Year}>{m.year}</div>
                    {m.event && <p style={S.s02Event}>{m.event}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 03 核心價值 —— 只有上留白，下方由 04 的 padding 接手（mockup4 的 `… 0`） */}
      <section style={S.s03}>
        <div>
          <span style={NUMERAL.default}>{String(next()).padStart(2, '0')}</span>
          <h2 style={S.s03Title}>
            {copy.values.title}
            <span style={S.s03Accent}>{copy.values.accent}</span>
          </h2>
        </div>
        <p style={S.s03Lead}>{copy.values.lead}</p>

        <div style={S.s03Grid} data-r="cols-2">
          {copy.values.items.map((v) => (
            <div key={v.title} style={S.s03Card}>
              <h3 style={S.s03CardTitle}>{v.title}</h3>
              <p style={S.s03CardBody}>{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 04 製造與品質 */}
      {manufacturing && (
        <section style={S.s04}>
          <div>
            <SectionHeading index={next()} title={copy.manufacturing} titleStyle={S.s04Title} />

            {(manufacturing.imageWide || manufacturing.imageSquare) && (
              <div style={S.s04Shots}>
                {manufacturing.imageWide && (
                  <img
                    src={manufacturing.imageWide.url}
                    srcSet={srcSetOf(manufacturing.imageWide)}
                    sizes="(max-width: 1024px) 100vw, 700px"
                    alt={manufacturing.imageWide.alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    width={1600}
                    height={900}
                    style={{ ...S.s04Wide, ...S.s04Img }}
                  />
                )}
                {manufacturing.imageSquare && (
                  <img
                    src={manufacturing.imageSquare.url}
                    srcSet={srcSetOf(manufacturing.imageSquare)}
                    sizes="(max-width: 1024px) 100vw, 420px"
                    alt={manufacturing.imageSquare.alt ?? ''}
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={1200}
                    style={{ ...S.s04Square, ...S.s04Img }}
                  />
                )}
              </div>
            )}

            {manufacturing.points && manufacturing.points.length > 0 && (
              /* 每欄頂上一條 2px 品牌青（mockup4） */
              <div style={S.s04Grid} data-r="cols-2">
                {manufacturing.points.map((p, i) => (
                  <div key={p.title ?? i} style={S.s04Item}>
                    {p.title && <h3 style={S.s04ItemTitle}>{p.title}</h3>}
                    {p.body && <p style={S.s04ItemBody}>{p.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 05 認證 */}
      {certItems.length > 0 && (
        <section style={S.s05}>
          <div style={S.s05Inner}>
            <div style={S.s05Grid}>
              <div>
                <SectionHeading index={next()} title={copy.certificates.title} titleStyle={S.h2} />
                <p style={S.s05Lead}>{copy.certificates.lead}</p>
                <Cta cta={{ label: copy.certificates.cta, url: `/${locale}/downloads` }} />
              </div>

              <div style={S.s05Cards} data-r="cols-2">
                {certItems.map((item, i) => (
                  <CertCard
                    key={item.certification ?? i}
                    slug={item.certification}
                    refs={page.refs.certifications}
                    /* mockup4 把第一張做成橫跨兩欄的青色漸層卡 */
                    hero={i === 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * 區段的 CTA。`external` 由編輯者決定 —— 外部連結用 `<a>` 加 noopener，
 * 站內連結走 `<Link>` 才有預先載入。兩者不能混用。
 */
function Cta({ cta }: { cta: SectionCta }) {
  return cta.external ? (
    <a
      href={cta.url}
      target="_blank"
      rel="noopener"
      style={S.s05Cta}
      className="hover:text-white"
      data-hover="lift-2-white"
    >
      {cta.label}
    </a>
  ) : (
    <Link href={cta.url!} style={S.s05Cta} className="hover:text-white" data-hover="lift-2-white">
      {cta.label}
    </Link>
  );
}

/**
 * 認證卡。區段只存 slug，實際內容在 `refs.certifications` ——
 * 這樣同一份認證在 About 與產品頁只維護一次（docs/05 §3.3）。
 * 查不到就不渲染：那表示編輯者刪了認證卻沒更新這一頁。
 */
function CertCard({
  slug,
  refs,
  hero = false,
}: {
  slug: string | undefined;
  refs: Record<string, CertificationRef>;
  /** mockup4 的第一張是橫跨兩欄的青色漸層卡，其餘是白底細框 */
  hero?: boolean;
}) {
  const cert = slug ? refs[slug] : undefined;
  if (!cert) return null;

  return (
    <div style={hero ? S.s05Hero : S.s05Card} data-hover={hero ? undefined : 'edge'}>
      {cert.logo && (
        <img
          src={cert.logo.url}
          alt={cert.logo.alt ?? cert.mark}
          loading="lazy"
          decoding="async"
          style={S.certLogo}
        />
      )}
      <div>
        <div style={hero ? S.s05HeroMark : S.s05CardMark}>{cert.mark}</div>
        {cert.subLabel && <div style={S.certSub}>{cert.subLabel}</div>}
        {cert.description && <p style={hero ? S.s05HeroBody : S.s05CardBody}>{cert.description}</p>}
      </div>
    </div>
  );
}
