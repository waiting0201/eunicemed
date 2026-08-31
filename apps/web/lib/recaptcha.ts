'use client';

/**
 * reCAPTCHA **v3**（分數制，畫面上沒有任何 widget）。
 *
 * <p>
 * 站台端只做兩件事：載入 Google 的腳本、送出時取一個 token 塞進 FormData。
 * 判定全在後端（`Api/Services/RecaptchaVerifier.cs`）——
 * **分數低不會擋件**，只是把那封信在收件匣標成 spam。
 * </p>
 *
 * <p>
 * ⚠️ **沒設 `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 時整支是 no-op**：腳本不載、token 不帶，
 * 表單行為與接上 reCAPTCHA 之前完全相同。site key 是 build 時內嵌的，
 * 換金鑰要重新 build（docs/07 §6.4）。
 * </p>
 *
 * <p>
 * ⚠️ 腳本在**表單掛載時**就載入，不是等按下送出才載 —— v3 的分數來自它對這段期間
 * 使用者行為的觀察，送出當下才載會讓每個人都拿到低分。
 * 也因此只有帶表單的頁面會載它，不是全站。
 * </p>
 */

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

/** 有沒有 site key。沒有的話 UI 也不必顯示 Google 的法律聲明。 */
export const recaptchaEnabled = Boolean(SITE_KEY);

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let loading: Promise<void> | null = null;

/** 載入腳本；重複呼叫共用同一個 Promise。 */
export function loadRecaptcha(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve) => {
    if (window.grecaptcha) return resolve();

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    // 載不起來（擋廣告的外掛、中國大陸連不到 google.com）也要 resolve ——
    // 表單必須照樣送得出去，後端在沒有 token 時的處理是標記而不是拒絕
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return loading;
}

/** 取一個 token。任何一步失敗都回 null，讓表單照常送出。 */
export async function recaptchaToken(action: string): Promise<string | null> {
  if (!SITE_KEY) return null;

  try {
    await loadRecaptcha();
    const api = window.grecaptcha;
    if (!api) return null;

    await new Promise<void>((resolve) => api.ready(resolve));
    return await api.execute(SITE_KEY, { action });
  } catch {
    return null;
  }
}

/**
 * 把 Server Action 包一層，在送出前補上 token。
 *
 * <p>
 * 包在 action 裡而不是用隱藏欄位 + onSubmit：v3 的 token 兩分鐘就過期，
 * 預先塞進欄位的那個在使用者慢慢打字時早就失效了。
 * </p>
 */
export function withRecaptcha<S>(
  action: (prev: S, form: FormData) => Promise<S>,
  name: string,
): (prev: S, form: FormData) => Promise<S> {
  return async (prev, form) => {
    const token = await recaptchaToken(name);
    if (token) form.set('recaptchaToken', token);
    return action(prev, form);
  };
}
