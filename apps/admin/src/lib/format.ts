/**
 * API 回的時間是 **UTC 但不帶 Z**（datetime2，見 `Api/Common/Clock.cs`）。
 * 直接丟 `new Date()` 會被當成本地時間，在 UTC+8 顯示會早八小時。
 * 一律先補上 Z。
 */
export function toDate(iso: string): Date {
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return toDate(iso).toLocaleDateString('zh-TW');
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return toDate(iso).toLocaleString('zh-TW', { hour12: false });
}

/**
 * 排程發布：狀態是「已發布」但時間還沒到。
 * 對編輯者而言那是第四種狀態 —— 不標出來的話他會以為已經上線了。
 */
export function isScheduled(status: number, publishedAt: string | null): boolean {
  return status === 1 && publishedAt !== null && toDate(publishedAt) > new Date();
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
