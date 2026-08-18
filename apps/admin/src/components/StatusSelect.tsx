import { StatusTag } from './StatusTag';

/**
 * 狀態切換 —— 給**沒有** publish 端點的模組用（子分類、認證）。
 *
 * <p>
 * 產品與文章的發布是獨立動作（Author 存得了草稿、發布不了），
 * 但子分類與認證的狀態只是一個欄位，跟著存檔一起送。
 * 兩者行為不同，所以長得也不一樣 —— 這裡是下拉，不是「發布」按鈕。
 * </p>
 */
const OPTIONS = [
  { value: 0, label: '草稿 —— 前台看不到' },
  { value: 1, label: '已發布 —— 前台看得到' },
  { value: 2, label: '封存 —— 前台看不到，保留資料' },
];

export function StatusSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <span className="flex items-center gap-2">
      <select
        className="form-control w-auto"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <StatusTag status={value} />
    </span>
  );
}
