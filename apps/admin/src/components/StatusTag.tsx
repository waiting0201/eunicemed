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
  0: { label: '草稿', mark: 'border border-ink-faint bg-transparent' },
  1: { label: '已發布', mark: 'bg-ink' },
  2: { label: '封存', mark: 'bg-[repeating-linear-gradient(135deg,var(--color-ink-faint)_0_2px,transparent_2px_4px)]' },
} as const;

export function StatusTag({ status, scheduled }: { status: number; scheduled?: boolean }) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS[0];

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.78rem] text-ink-soft">
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[2px] ${s.mark}`} />
      {/* 排程發布在後端是 Published + 未來時間 —— 對編輯者而言那是第四種狀態，
          不標出來的話他會以為已經上線了 */}
      {scheduled ? '已排程' : s.label}
    </span>
  );
}
