/**
 * 內容狀態。
 *
 * <p>
 * docs/03 §8.1 要求三態**不靠顏色也能分辨**（色盲友善）。
 * 所以形狀本身帶資訊：草稿是空心方框、已發布是實心、封存是斜線填充。
 * 文字標籤永遠在，顏色只是輔助。
 * </p>
 *
 * <p>
 * 這裡刻意**不用綠色**代表已發布 —— 全站沒有綠色，
 * 「完成」由儀表填滿表達，狀態只表達生命週期。
 * </p>
 */
const STATUS = {
  0: { label: '草稿', style: { border: '1px solid var(--text-muted)' } },
  1: { label: '已發布', style: { background: 'var(--text-primary)' } },
  2: {
    label: '封存',
    style: {
      background:
        'repeating-linear-gradient(135deg,var(--text-muted) 0 2px,transparent 2px 4px)',
    },
  },
} as const;

export function StatusTag({ status, scheduled }: { status: number; scheduled?: boolean }) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS[0];

  return (
    <span className="badge">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={s.style} />
      {/* 排程發布在後端是 Published + 未來時間 —— 對編輯者而言那是第四種狀態，
          不標出來的話他會以為已經上線了 */}
      {scheduled ? '已排程' : s.label}
    </span>
  );
}
