import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, type AdminProductListItem } from '@/lib/api';
import { LocaleGauges } from '@/components/Gauge';
import { StatusTag } from '@/components/StatusTag';
import { describeLevel, levelOf, type LocaleLevels } from '@/lib/completeness';

/**
 * 產品列表 —— 後台最密集的畫面，也是驗證儀表的地方。
 *
 * <p>
 * 149 筆匯入產品目前只有英文翻譯。整條 zh-TW 軌是空的，
 * 而這件事在前台完全看不出來（語言純度直接讓它們消失）。
 * 這頁的存在意義就是讓那件事一眼看見。
 * </p>
 */
const PAGE_SIZE = 20;

export function Products() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['products', page, search, status],
    queryFn: () =>
      api.products({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search: search || undefined,
        status: status || undefined,
      }),
    // 換頁時保留上一頁的資料，避免整張表閃一下 —— 掃視中的人會失去位置
    placeholderData: keepPreviousData,
  });

  const missingZh = data?.items.filter((p) => !p.nameZhTw).length ?? 0;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <div className="eyebrow">內容</div>
          <h1 className="page-title">產品</h1>
        </div>
        {data && (
          <p className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="mono">{data.totalCount}</span> 筆
            {missingZh > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--red)' }}>
                  本頁 <span className="mono">{missingZh}</span> 筆缺中文
                </span>
              </>
            )}
          </p>
        )}
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="搜尋名稱或 SKU"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="form-control w-64"
        />
        {/* 搜尋比對名稱與 SKU，不比對 slug —— 與後端一致（docs/api-routes.md），
            寫在 placeholder 裡讓人不必猜 */}

        {[
          { value: '', label: '全部' },
          { value: 'published', label: '已發布' },
          { value: 'draft', label: '草稿' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setStatus(option.value);
              setPage(1);
            }}
            aria-pressed={status === option.value}
            className={`btn btn-sm ${status === option.value ? 'btn-primary' : 'btn-secondary'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isError && (
        <p role="alert" className="alert mb-4">
          {error instanceof Error ? error.message : '讀取失敗。'}
        </p>
      )}

      <div className="panel table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th className="w-[3.25rem]" />
              <th>名稱</th>
              <th className="w-28">SKU</th>
              <th className="w-36">分類</th>
              <th className="w-36">內容完整度</th>
              <th className="w-24">狀態</th>
            </tr>
          </thead>
          <tbody>
            {isPending &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <span
                      className="block h-4 w-full animate-pulse rounded-sm"
                      style={{ background: 'var(--bg-elevated)' }}
                    />
                  </td>
                </tr>
              ))}

            {data?.items.map((product) => <Row key={product.id} product={product} />)}

            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                  沒有符合條件的產品。調整搜尋或篩選再試一次。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一頁
          </button>
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
            {data.page} / {data.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </button>
        </div>
      )}
    </>
  );
}

function Row({ product }: { product: AdminProductListItem }) {
  const levels = completenessOf(product);

  return (
    <tr>
      <td>
        <span
          className="block h-9 w-9 overflow-hidden rounded-sm"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {product.primaryImageUrl && (
            <img
              src={product.primaryImageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </span>
      </td>

      <td className="max-w-0">
        <Link to={`/products/${product.id}`} className="block truncate font-medium">
          {product.nameEn ?? product.nameZhTw ?? '（未命名）'}
        </Link>
        {/* slug 用等寬：它是要逐字比對的字串，不是給人讀的句子 */}
        <span className="mono block truncate" style={{ color: 'var(--text-muted)' }}>
          {product.slug}
        </span>
      </td>

      <td>
        <span className="mono">{product.sku ?? '—'}</span>
      </td>

      <td className="max-w-0">
        <span
          className="mono block truncate text-[0.78rem]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {product.subCategorySlug ?? product.categorySlug ?? '—'}
        </span>
      </td>

      <td>
        <LocaleGauges levels={levels} labelOf={describeLevel} animateKey={product.id} />
      </td>

      <td>
        <StatusTag
          status={product.status}
          scheduled={
            product.status === 1 &&
            product.publishedAt !== null &&
            new Date(product.publishedAt) > new Date()
          }
        />
      </td>
    </tr>
  );
}

/**
 * 產品列表端點只回名稱，看不到摘要與 SEO ——
 * 所以列表上的儀表**最多只到第 1 段**（有名稱 = 前台看得到）。
 * 第 2、3 段要等進到編輯頁、拿得到完整欄位時才判得出來。
 *
 * 這是刻意的：列表要回答的問題是「哪些在該語系根本不存在」，
 * 而那正好是第 0 段與第 1 段的分界。為了多兩格而讓列表端點回傳整份內容並不划算。
 */
function completenessOf(product: AdminProductListItem): LocaleLevels {
  return {
    en: levelOf([Boolean(product.nameEn), false, false]),
    'zh-TW': levelOf([Boolean(product.nameZhTw), false, false]),
  };
}


