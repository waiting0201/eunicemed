import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type ContactDetail,
  type ContactStatus,
  type ContactType,
} from '@/lib/api';
import { DataTable, FilterGroup, ListPage, Pager } from '@/components/ListPage';
import { Dialog } from '@/components/Dialog';
import { formatDateTime } from '@/lib/format';

/**
 * 表單收件匣。
 *
 * <p>
 * **全站唯一內容不是我們寫的模組** —— 來信只能讀與標記，沒有建立、沒有編輯，
 * 也沒有翻譯這個維度。所以這頁不掛完整度儀表（那衡量的是「我們補了多少」），
 * 側欄改用未處理筆數 —— 它回答的是同一個每天要問的問題：有幾封在等。
 * </p>
 *
 * <p>
 * 預設只看未處理的：收件匣的用途是清空，不是瀏覽。
 * </p>
 */
const TYPES: { value: ContactType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'general', label: '一般洽詢' },
  { value: 'product', label: '產品詢價' },
  { value: 'partnership', label: '合作洽詢' },
];

const STATUSES: { value: ContactStatus | ''; label: string }[] = [
  { value: 'received', label: '未處理' },
  { value: 'handled', label: '已處理' },
  { value: 'spam', label: '垃圾' },
  { value: '', label: '全部' },
];

/**
 * 狀態標記。沿用 {@link StatusTag} 的規則：**形狀本身帶資訊**，顏色只是輔助
 * （docs/03 §8.1，色盲友善）。未處理是實心品牌青 —— 與側欄的未處理徽章同一個顏色，
 * 因為那是同一件事。
 */
const STATUS_TAG: Record<ContactStatus, { label: string; style: React.CSSProperties }> = {
  received: { label: '未處理', style: { background: 'var(--gauge)' } },
  handled: { label: '已處理', style: { border: '1px solid var(--text-muted)' } },
  spam: {
    label: '垃圾',
    style: {
      background: 'repeating-linear-gradient(135deg,var(--text-muted) 0 2px,transparent 2px 4px)',
    },
  },
};

const TYPE_LABEL: Record<ContactType, string> = {
  general: '一般洽詢',
  product: '產品詢價',
  partnership: '合作洽詢',
};

export function ContactSubmissions() {
  const [type, setType] = useState<ContactType | ''>('');
  const [status, setStatus] = useState<ContactStatus | ''>('received');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ['contact-submissions', type, status, page],
    queryFn: () =>
      api.contactSubmissions({
        type: type || undefined,
        status: status || undefined,
        page: String(page),
      }),
  });

  const items = data?.items ?? [];

  /** 帶著目前的篩選條件匯出 —— 畫面上看到的就是拿到的。 */
  async function download() {
    setExporting(true);
    try {
      const blob = await api.exportContactSubmissions({
        type: type || undefined,
        status: status || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contact-submissions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <ListPage
      eyebrow="日常"
      title="表單收件匣"
      summary={
        data && (
          <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.totalCount}</span> 封
          </span>
        )
      }
      actions={
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={exporting || items.length === 0}
          onClick={() => void download()}
        >
          {exporting ? '匯出中…' : '匯出 CSV'}
        </button>
      }
      filters={
        <>
          <FilterGroup
            value={status}
            options={STATUSES}
            onChange={(next) => {
              setStatus(next);
              setPage(1);
            }}
          />
          <span className="mx-1 h-5 w-px" style={{ background: 'var(--border)' }} />
          <FilterGroup
            value={type}
            options={TYPES}
            onChange={(next) => {
              setType(next);
              setPage(1);
            }}
          />
        </>
      }
    >
      <DataTable
        columns={5}
        isPending={isPending}
        error={error}
        isEmpty={items.length === 0}
        emptyText={emptyText(type, status)}
        head={
          <tr>
            <th className="w-40">送出時間</th>
            <th className="w-28">類型</th>
            <th className="w-56">寄件人</th>
            <th>主旨</th>
            <th className="w-24">狀態</th>
          </tr>
        }
      >
        {items.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer"
            onClick={() => setOpenId(row.id)}
            title="查看這封來信"
          >
            <td>
              <span className="mono text-[0.82rem]">{formatDateTime(row.createdAt)}</span>
            </td>
            <td>
              <span className="text-[0.85rem]">{TYPE_LABEL[row.type]}</span>
            </td>
            <td className="max-w-0">
              <span className="block truncate font-medium">{row.name}</span>
              <span
                className="block truncate text-[0.78rem]"
                style={{ color: 'var(--text-muted)' }}
              >
                {row.company ? `${row.company} · ${row.email}` : row.email}
              </span>
            </td>
            <td className="max-w-0">
              <span className="block truncate text-[0.85rem]">
                {row.subject ?? row.productSku ?? '—'}
              </span>
            </td>
            <td>
              <StatusBadge status={row.status} />
            </td>
          </tr>
        ))}
      </DataTable>

      <Pager page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      {openId && <SubmissionDialog id={openId} onClose={() => setOpenId(null)} />}
    </ListPage>
  );
}

function StatusBadge({ status }: { status: ContactStatus }) {
  const s = STATUS_TAG[status];
  return (
    <span className="badge">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={s.style} />
      {s.label}
    </span>
  );
}

/** 一封來信的全文與處理動作。內容不可編輯 —— 這是訪客寫的。 */
function SubmissionDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ['contact-submission', id],
    queryFn: () => api.contactSubmission(id),
  });

  const mark = useMutation({
    mutationFn: (status: ContactStatus) => api.markContactSubmission(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      void queryClient.invalidateQueries({ queryKey: ['contact-submission', id] });
      void queryClient.invalidateQueries({ queryKey: ['summary'] });
      onClose();
    },
  });

  return (
    <Dialog
      title={data ? `${TYPE_LABEL[data.type]} · ${data.name}` : '來信'}
      width="44rem"
      onClose={onClose}
      footer={
        data && (
          <>
            {mark.error && (
              <p role="alert" className="alert mr-auto my-0 py-1">
                {mark.error instanceof Error ? mark.error.message : '更新失敗。'}
              </p>
            )}
            {data.status !== 'spam' && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={mark.isPending}
                onClick={() => mark.mutate('spam')}
              >
                標為垃圾
              </button>
            )}
            {data.status === 'received' ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={mark.isPending}
                onClick={() => mark.mutate('handled')}
              >
                標為已處理
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={mark.isPending}
                onClick={() => mark.mutate('received')}
              >
                退回未處理
              </button>
            )}
          </>
        )
      }
    >
      {error != null && (
        <p role="alert" className="alert">
          {error instanceof Error ? error.message : '讀取失敗。'}
        </p>
      )}
      {isPending && <p style={{ color: 'var(--text-muted)' }}>讀取中…</p>}
      {data && <SubmissionBody data={data} />}
    </Dialog>
  );
}

function SubmissionBody({ data }: { data: ContactDetail }) {
  // 有值才佔一列 —— 三支表單問的欄位不同，統一列出來會有一半是「—」
  const rows: [string, string | null][] = [
    ['送出時間', formatDateTime(data.createdAt)],
    ['電子郵件', data.email],
    ['電話', data.phone],
    ['公司', data.company],
    ['國家', data.country],
    ['合作類型', data.partnershipType],
    ['產品型號', data.productSku],
    ['主旨', data.subject],
    ['語系', data.locale],
    ['來源 IP', data.ipAddress],
  ];

  return (
    <>
      <dl className="mb-4 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 text-[0.85rem]">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
              <dd className="mono break-words">{value}</dd>
            </div>
          ))}
      </dl>

      <div
        className="whitespace-pre-wrap rounded p-3 text-[0.9rem]"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
      >
        {data.message}
      </div>

      <p className="mt-3 text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>
        直接回信給 <a href={`mailto:${data.email}`}>{data.email}</a>。
      </p>
    </>
  );
}

function emptyText(type: ContactType | '', status: ContactStatus | '') {
  if (status === 'received') return '沒有待處理的來信。';
  if (type || status) return '沒有符合這組條件的來信。';
  return '還沒有人送出表單。';
}
