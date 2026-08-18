import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminRedirect } from '@/lib/api';
import { DataTable, ListPage } from '@/components/ListPage';
import { Field, FieldRow } from '@/components/form/Field';
import { formatDate } from '@/lib/format';

/**
 * 舊網址轉址。
 *
 * <p>
 * 執行在前端 middleware，規則表快取 5 分鐘 —— 所以這裡改完**不會立刻生效**。
 * 那是刻意的（middleware 每次導覽都跑，逐次打 API 會把後端請求量放大到與流量同級），
 * 但編輯者需要知道，否則會以為沒存成功。
 * </p>
 */
const STATUS_CODES = [301, 302, 307, 308];

export function Redirects() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminRedirect | 'new' | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ['redirects', search],
    queryFn: () => api.redirects(search || undefined),
  });

  return (
    <ListPage
      eyebrow="系統"
      title="轉址"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.length}</span> 條
          </span>
        )
      }
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          新增轉址
        </button>
      }
      filters={
        <input
          type="search"
          className="form-control w-64"
          placeholder="搜尋來源或目標路徑"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      <p className="form-hint mb-3">
        轉址由前端 middleware 執行，規則快取 5 分鐘 —— 剛存的規則最多五分鐘後生效。
      </p>

      <DataTable
        columns={5}
        isPending={isPending}
        error={error}
        isEmpty={data?.length === 0}
        emptyText="還沒有轉址規則。舊站的網址對照見 docs/10-legacy-content.md。"
        head={
          <tr>
            <th>來源路徑</th>
            <th>目標路徑</th>
            <th className="w-24">狀態碼</th>
            <th className="w-28">建立於</th>
            <th className="w-20" />
          </tr>
        }
      >
        {data?.map((r) => (
          <tr key={r.id}>
            <td className="max-w-0">
              <span className="mono block truncate">{r.fromPath}</span>
            </td>
            <td className="max-w-0">
              <span className="mono block truncate">{r.toPath}</span>
            </td>
            <td>
              <span className="mono">{r.statusCode}</span>
            </td>
            <td>
              <span className="mono text-[0.78rem]">{formatDate(r.createdAt)}</span>
            </td>
            <td>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(r)}>
                編輯
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {editing && (
        <RedirectDialog
          redirect={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] });
            setEditing(null);
          }}
        />
      )}
    </ListPage>
  );
}

function RedirectDialog({
  redirect,
  onClose,
  onSaved,
}: {
  redirect: AdminRedirect | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fromPath, setFromPath] = useState(redirect?.fromPath ?? '');
  const [toPath, setToPath] = useState(redirect?.toPath ?? '');
  const [statusCode, setStatusCode] = useState(redirect?.statusCode ?? 301);
  const [error, setError] = useState<string | null>(null);

  const body = { fromPath, toPath, statusCode };

  const save = useMutation({
    mutationFn: () =>
      redirect ? api.updateRedirect(redirect.id, body) : api.createRedirect(body),
    onSuccess: onSaved,
    // 自我轉址 400、來源重複 409 —— 後端的訊息已經說清楚了
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteRedirect(redirect!.id),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '刪除失敗。'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="panel w-[min(34rem,92vw)]">
        <div className="panel-header">
          <h2 className="text-[0.95rem] font-semibold">{redirect ? '編輯轉址' : '新增轉址'}</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            關閉
          </button>
        </div>

        <div className="panel-body">
          <Field
            label="來源路徑"
            required
            hint="舊網址。開頭的斜線與結尾的斜線會自動正規化，比對不分大小寫。"
          >
            <input
              className="form-control mono"
              placeholder="/en/find-your-product"
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
            />
          </Field>

          <Field label="目標路徑" required>
            <input
              className="form-control mono"
              placeholder="/en/products"
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
            />
          </Field>

          <FieldRow>
            <Field
              label="狀態碼"
              hint="301 為永久轉址，搜尋引擎會把權重移轉過去。臨時性的用 302。"
            >
              <select
                className="form-control mono"
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value))}
              >
                {STATUS_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Field>
          </FieldRow>

          {error && (
            <p role="alert" className="alert mb-4">
              {error}
            </p>
          )}

          <div className="flex justify-between gap-2">
            {redirect ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                刪除
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={save.isPending || !fromPath || !toPath}
              onClick={() => save.mutate()}
            >
              {save.isPending ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
