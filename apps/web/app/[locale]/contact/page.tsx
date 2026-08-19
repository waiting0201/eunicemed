import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type Settings } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/locale';
import { ContactForm } from '@/components/ContactForm';

type Params = { locale: string };

/**
 * Contact 頁。版型照 `mockup4/Contact.dc.html`：左側標題與四張聯絡資訊卡，
 * 右側淺青漸層面板裡放一張白色表單卡（漸層是 DESIGN.md 說的
 * 「原本深色面改為淺青漸層」兩處之一）。
 *
 * <p>
 * 聯絡資訊取自 `GET /settings`，與頁尾同一份來源（docs/03-cms.md §3）；
 * 取不到就退回 CLAUDE.md §1 記載的品牌方資料。
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
    addressValue: string;
    hoursValue: string;
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
    addressValue:
      '11F, No. 123-9, Xingde Rd, Sanchong Dist, New Taipei City 24158, Taiwan',
    hoursValue: 'Mon–Fri 09:00–18:00 (UTC+8)',
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
    addressValue: '24158 新北市三重區興德路 123-9 號 11 樓',
    hoursValue: '週一至週五 09:00–18:00（UTC+8）',
    metaTitle: '聯絡我們',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
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
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#E9F8FA] text-brand-deep">
        {icon}
      </span>
      <div>
        <h3 className="text-[1.02rem] font-[570]">{label}</h3>
        <p className="text-[0.95rem]">{children}</p>
      </div>
    </div>
  );
}

const ICON = {
  className: 'h-[22px] w-[22px]',
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
  const settings = await api.settings(locale).catch((): Settings => ({}));
  const s = (key: string, fallback: string) =>
    typeof settings[key] === 'string' ? (settings[key] as string) : fallback;

  const address = s('company.address', c.addressValue);
  const hours = s('company.hours', c.hoursValue);
  const phone = s('company.phone', '+886 2 8511 3758');
  const email = s('company.email', 'service@comfortplus-medical.com');

  return (
    <section className="mx-auto max-w-content px-gutter py-[clamp(56px,7vw,80px)]">
      <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-[0.78rem] font-[680] uppercase tracking-[0.16em] text-brand-deep">
            {c.eyebrow}
          </p>
          <h1 className="mt-[14px] mb-5 text-[clamp(2.2rem,4.2vw,3.2rem)] font-normal">
            {c.title}
          </h1>
          <p className="mb-9 max-w-[44ch] text-[1.08rem]">{c.lead}</p>

          <div className="flex flex-col gap-[22px]">
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

        <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(150deg,#F4FAFC_0%,#E3F2F6_55%,#CFE9EF_100%)] p-[clamp(32px,4vw,44px)]">
          {/* 右下角的三環動線標記，純裝飾 */}
          <svg
            viewBox="0 0 400 400"
            aria-hidden="true"
            className="pointer-events-none absolute -right-[120px] -bottom-[120px] h-[360px] w-[360px] opacity-50"
          >
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
