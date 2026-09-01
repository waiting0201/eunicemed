import type { Locale } from './locale';

/**
 * 品牌方的聯絡資訊。**寫在程式碼裡，不進 CMS**（docs/15-cms-scope.md）。
 *
 * <p>
 * 這幾項曾經是 `Setting` 資料表的鍵，由後台的「設定」畫面維護 ——
 * 但那張表從頭到尾是空的，站上跑的一直是各頁自己的預設值，
 * 於是「可以在後台改」只是個沒兌現的承諾，還讓同一份地址散在兩個地方。
 * 收成這一支之後，改公司資訊是改這裡。
 * </p>
 *
 * <p>值取自 CLAUDE.md §1 的品牌方資料。</p>
 */
export const COMPANY = {
  /** 電話與信箱不隨語系變 */
  phone: '+886 2 8511 3758',
  email: 'service@comfortplus-medical.com',
  /** ⚠️ 品牌方尚未提供正式的 LinkedIn 網址，此為推定值 */
  linkedIn: 'https://www.linkedin.com/company/eunicemed',
} as const;

/**
 * 拆成欄位的地址。**只給 JSON-LD 的 `PostalAddress` 用** ——
 * 畫面上一律用同一列的 `address` 那一整串，不要在畫面重新拼接。
 */
export type PostalAddress = {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 */
  addressCountry: string;
};

export const COMPANY_LOCALIZED: Record<
  Locale,
  { address: string; hours: string; postal: PostalAddress }
> = {
  en: {
    address: '11F, No. 123-9, Xingde Rd, Sanchong Dist, New Taipei City 24158, Taiwan',
    hours: 'Mon–Fri 09:00–18:00 (UTC+8)',
    postal: {
      streetAddress: '11F, No. 123-9, Xingde Rd',
      addressLocality: 'Sanchong Dist',
      addressRegion: 'New Taipei City',
      postalCode: '24158',
      addressCountry: 'TW',
    },
  },
  'zh-TW': {
    address: '24158 新北市三重區興德路 123-9 號 11 樓',
    hours: '週一至週五 09:00–18:00（UTC+8）',
    postal: {
      streetAddress: '興德路 123-9 號 11 樓',
      addressLocality: '三重區',
      addressRegion: '新北市',
      postalCode: '24158',
      addressCountry: 'TW',
    },
  },
};

/**
 * 營業時間的機器可讀版（`OpeningHoursSpecification`）。
 * 與上面 `hours` 那句話是同一件事的兩種寫法 —— 改一邊要改另一邊。
 */
export const OPENING_HOURS = {
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  opens: '09:00',
  closes: '18:00',
} as const;
