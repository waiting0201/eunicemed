import { css } from '@/lib/css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { COMPANY, COMPANY_LOCALIZED } from '@/lib/company';
import { isLocale, type Locale } from '@/lib/locale';
import { ContactForm } from '@/components/ContactForm';

/** 樣式逐字取自 `mockup4/Contact.dc.html`。 */
const S = {
  section: css`max-width:1180px;margin:0 auto;padding:clamp(56px,7vw,80px) clamp(24px,5vw,64px);`,
  grid: css`display:grid;grid-template-columns:1fr 1.1fr;gap:64px;align-items:start;`,
  eyebrow: css`color:#0092A8;font-weight:680;letter-spacing:.16em;text-transform:uppercase;font-size:.78rem;`,
  title: css`color:#16333B;font-weight:400;font-size:clamp(2.2rem,4.2vw,3.2rem);margin:14px 0 20px;`,
  lead: css`font-size:1.08rem;max-width:44ch;margin-bottom:36px;`,
  rows: css`display:flex;flex-direction:column;gap:22px;`,
  row: css`display:flex;gap:16px;align-items:flex-start;`,
  rowIcon: css`width:44px;height:44px;flex:0 0 auto;border-radius:12px;background:#E9F8FA;color:#0092A8;display:flex;align-items:center;justify-content:center;`,
  rowTitle: css`color:#16333B;font-weight:570;font-size:1.02rem;`,
  rowBody: css`font-size:.95rem;`,
  panel: css`position:relative;overflow:hidden;background:linear-gradient(150deg,#F4FAFC 0%,#E3F2F6 55%,#CFE9EF 100%);border-radius:26px;padding:clamp(32px,4vw,44px);`,
  rings: css`position:absolute;bottom:-120px;right:-120px;width:360px;height:360px;opacity:.5;pointer-events:none;`,
} as const;

type Params = { locale: string };

/**
 * Contact 頁。版型照 `mockup4/Contact.dc.html`：左側標題與四張聯絡資訊卡，
 * 右側淺青漸層面板裡放一張白色表單卡（漸層是 DESIGN.md 說的
 * 「原本深色面改為淺青漸層」兩處之一）。
 *
 * <p>
 * 聯絡資訊寫在 `lib/company.ts`，不進 CMS（docs/15）——
 * 值取自 CLAUDE.md §1 記載的品牌方資料。
 * </p>
 */
const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    lead: string;
    address: string;
    phone: string;
    email: string;
    hours: string;
    metaTitle: string;
  }
> = {
  en: {
    eyebrow: 'Contact',
    title: "Let's talk",
    lead: 'Questions about products, sizing or partnership? Our team is glad to help.',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    hours: 'Hours',
    metaTitle: 'Contact',
  },
  'zh-TW': {
    eyebrow: '聯絡我們',
    title: '與我們談談',
    lead: '關於產品、尺寸或合作有任何問題，我們很樂意協助。',
    address: '地址',
    phone: '電話',
    email: '電子郵件',
    hours: '營業時間',
    metaTitle: '聯絡我們',
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const c = COPY[locale];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eunicemed.com';

  return {
    title: c.metaTitle,
    description: c.lead,
    alternates: {
      canonical: `${siteUrl}/${locale}/contact`,
      languages: {
        en: `${siteUrl}/en/contact`,
        'zh-TW': `${siteUrl}/zh-TW/contact`,
      },
    },
  };
}

/** 資訊卡的 icon 底圓：44px 圓角方塊、`#E9F8FA` 底、`#0092A8` 線條（mockup4）。 */
function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={S.row}>
      <span style={S.rowIcon}>{icon}</span>
      <div>
        <h3 style={S.rowTitle}>{label}</h3>
        <p style={S.rowBody}>{children}</p>
      </div>
    </div>
  );
}

const ICON = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  'aria-hidden': true,
} as const;

export default async function ContactPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const c = COPY[locale];
  const { address, hours } = COMPANY_LOCALIZED[locale];
  const { phone, email } = COMPANY;

  return (
    <section style={S.section}>
      <div style={S.grid}>
        <div>
          <p style={S.eyebrow}>{c.eyebrow}</p>
          <h1 style={S.title}>{c.title}</h1>
          <p style={S.lead}>{c.lead}</p>

          <div style={S.rows}>
            <InfoRow
              label={c.address}
              icon={
                <svg {...ICON}>
                  <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              }
            >
              {address}
            </InfoRow>

            <InfoRow
              label={c.phone}
              icon={
                <svg {...ICON}>
                  <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                </svg>
              }
            >
              {/* tel: 要去掉空白，否則部分手機撥號會失敗 */}
              <a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>
            </InfoRow>

            <InfoRow
              label={c.email}
              icon={
                <svg {...ICON}>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              }
            >
              <a href={`mailto:${email}`}>{email}</a>
            </InfoRow>

            <InfoRow
              label={c.hours}
              icon={
                <svg {...ICON}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              }
            >
              {hours}
            </InfoRow>
          </div>
        </div>

        <div style={S.panel}>
          {/* 右下角的三環動線標記，純裝飾 */}
          <svg viewBox="0 0 400 400" aria-hidden="true" style={S.rings}>
            <g fill="none" strokeLinecap="round">
              <circle cx="360" cy="360" r="90" stroke="rgba(0,181,205,.5)" strokeWidth="20" />
              <circle cx="360" cy="360" r="150" stroke="rgba(0,181,205,.34)" strokeWidth="20" />
              <circle cx="360" cy="360" r="210" stroke="rgba(0,181,205,.2)" strokeWidth="20" />
            </g>
          </svg>

          <ContactForm locale={locale} />
        </div>
      </div>
    </section>
  );
}
