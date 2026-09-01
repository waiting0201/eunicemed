import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type AdminUserRow } from '@/lib/api';
import { DataTable, ListPage } from '@/components/ListPage';
import { Field, FieldRow } from '@/components/form/Field';
import { MultiSelect } from '@/components/form/MultiSelect';
import { formatDateTime } from '@/lib/format';

/**
 * 使用者管理（Admin 專屬 —— 授權由 AppRouter 把關）。
 *
 * <p>
 * 後端有三項自我保護：不可停用自己、不可移除自己的 Admin 角色、不可刪除自己。
 * 前端不重複判斷 —— 那需要知道「我是誰」，而重複的規則遲早會與後端漂移。
 * 錯誤訊息直接顯示後端那一句。
 * </p>
 */
const ROLES = [
  { id: 'Admin', label: 'Admin — 全部權限，含使用者與設定' },
  { id: 'Editor', label: 'Editor — 內容 CRUD 與發布' },
  { id: 'Author', label: 'Author — 只能建立與編輯草稿' },
  { id: 'Viewer', label: 'Viewer — 唯讀' },
];

export function Users() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminUserRow | 'new' | null>(null);

  const { data, isPending, error } = useQuery({ queryKey: ['users'], queryFn: () => api.users() });

  return (
    <ListPage
      eyebrow="系統"
      title="使用者"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.length}</span> 人
          </span>
        )
      }
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          新增使用者
        </button>
      }
    >
      <DataTable
        columns={5}
        isPending={isPending}
        error={error}
        isEmpty={data?.length === 0}
        emptyText="還沒有使用者。"
        head={
          <tr>
            <th>使用者</th>
            <th className="w-48">角色</th>
            <th className="w-24">狀態</th>
            <th className="w-36">最後登入</th>
            <th className="w-20" />
          </tr>
        }
      >
        {data?.map((user) => (
          <tr key={user.id}>
            <td className="max-w-0">
              <span className="block truncate font-medium">{user.displayName}</span>
              <span className="mono block truncate" style={{ color: 'var(--text-muted)' }}>
                {user.email}
              </span>
            </td>
            <td>
              <span className="flex flex-wrap gap-1">
                {user.roles.map((r) => (
                  <span key={r} className="badge">
                    {r}
                  </span>
                ))}
              </span>
            </td>
            <td>
              <span className="flex flex-col gap-0.5 text-[0.78rem]">
                {!user.isActive && <span style={{ color: 'var(--red)' }}>已停用</span>}
                {user.isLocked && <span style={{ color: 'var(--red)' }}>已鎖定</span>}
                {/* 首次登入須改密碼是常態，不是問題 —— 用中性色 */}
                {user.mustChangePassword && (
                  <span style={{ color: 'var(--text-muted)' }}>待改密碼</span>
                )}
                {user.isActive && !user.isLocked && !user.mustChangePassword && (
                  <span style={{ color: 'var(--text-muted)' }}>正常</span>
                )}
              </span>
            </td>
            <td>
              <span className="mono text-[0.78rem]">{formatDateTime(user.lastLoginAt)}</span>
            </td>
            <td>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setEditing(user)}
              >
                編輯
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {editing && (
        <UserDialog
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditing(null);
          }}
        />
      )}
    </ListPage>
  );
}

function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(user?.roles ?? ['Viewer']);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      user
        ? api.updateUser(user.id, {
            email,
            displayName,
            roles,
            isActive,
            // 空白代表不改密碼 —— 送空字串會被後端當成「要改成空的」而擋下
            password: password || undefined,
            unlock: user.isLocked ? true : undefined,
          })
        : api.createUser({ email, displayName, password, roles }),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '儲存失敗。'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteUser(user!.id),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof ApiError ? e.message : '刪除失敗。'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="panel w-[min(34rem,92vw)] max-h-[88vh] overflow-y-auto">
        <div className="panel-header">
          <h2 className="text-[0.95rem] font-semibold">{user ? '編輯使用者' : '新增使用者'}</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            關閉
          </button>
        </div>

        <div className="panel-body">
          <FieldRow>
            <Field label="帳號" required hint="登入用的識別，全站唯一。可以是電子郵件，也可以是純帳號名（例如 admin）。">
              <input
                className="form-control mono"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="顯示名稱" required>
              <input
                className="form-control"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
          </FieldRow>

          <Field
            label={user ? '重設密碼' : '密碼'}
            required={!user}
            hint={
              user
                ? '留空表示不改密碼。改了之後該使用者的所有登入階段會被撤銷，且下次登入須再改一次。'
                : '長度下限由 Auth__MinPasswordLength 決定（預設 12）。'
            }
          >
            <input
              className="form-control"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <MultiSelect
            label="角色"
            options={ROLES}
            selected={roles}
            onChange={setRoles}
            keyOf={(r) => r.id}
            labelOf={(r) => r.label}
          />

          {user && (
            <>
              <label className="mb-4 flex items-center gap-2 text-[0.9rem]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                啟用中
              </label>

              {/* 鎖定是登入失敗累積造成的，儲存時一併解鎖 */}
              {user.isLocked && (
                <p className="form-hint mb-4" style={{ color: 'var(--yellow)' }}>
                  這個帳號因連續登入失敗被鎖定，儲存時會一併解鎖。
                </p>
              )}
            </>
          )}

          {error && (
            <p role="alert" className="alert mb-4">
              {error}
            </p>
          )}

          <div className="flex justify-between gap-2">
            {user ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--red)' }}
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                刪除帳號
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={save.isPending || !email || !displayName || (!user && !password)}
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
