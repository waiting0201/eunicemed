import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api, auth, ApiError } from '@/lib/api';

/**
 * 登入。
 *
 * <p>
 * 錯誤訊息直接用後端回的那一句 —— 後端已經把「帳密錯誤」「帳號鎖定」
 * 「請求過於頻繁」分開了（Phase 2 的速率限制與失敗鎖定），
 * 前端再翻譯一次只會讓兩邊的說法漂移。
 * </p>
 */
export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await api.login(email, password);
      auth.set(result.accessToken, result.refreshToken);
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '無法連線到伺服器。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-[22rem] border border-rule bg-surface p-8"
      >
        <div className="label-condensed text-ink">EuniceMed</div>
        <h1 className="mt-1 font-display text-[1.4rem] font-normal">內容管理</h1>

        <label className="mt-7 block">
          <span className="label-condensed text-ink-faint">電子郵件</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mono mt-1.5 w-full border border-rule bg-paper px-3 py-2 focus:border-gauge focus:outline-none"
          />
        </label>

        <label className="mt-4 block">
          <span className="label-condensed text-ink-faint">密碼</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full border border-rule bg-paper px-3 py-2 focus:border-gauge focus:outline-none"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-4 border-l-2 border-missing bg-missing-soft px-3 py-2 text-[0.85rem] text-missing"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full bg-ink px-4 py-2.5 text-[0.92rem] font-medium text-white transition hover:bg-ink-soft disabled:opacity-50"
        >
          {busy ? '登入中…' : '登入'}
        </button>
      </form>
    </div>
  );
}
