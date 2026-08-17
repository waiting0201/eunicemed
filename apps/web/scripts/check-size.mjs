import { execSync } from 'node:child_process';

/**
 * SWA Free 方案的單一環境上限是 250MB，超出即部署失敗（docs/07 §7.1）。
 * 在本機 build 就擋下來，不要等 CI 或部署才發現。
 *
 * 全部環境合計上限是 500MB，所以實務上只夠 prod + 1 個預覽環境 ——
 * 逼近上限時預覽環境會先開始失敗。
 */
const LIMIT_MB = 250;
const WARN_MB = 200;

const out = execSync('du -sm .next/standalone', { encoding: 'utf8' });
const mb = Number(out.trim().split(/\s+/)[0]);

if (Number.isNaN(mb)) {
  console.warn('[check-size] 無法量測產物大小，略過。');
  process.exit(0);
}

if (mb > LIMIT_MB) {
  console.error(`\n[check-size] ✗ standalone 產物 ${mb}MB，超過 SWA Free 的 ${LIMIT_MB}MB 上限。`);
  console.error('  部署會失敗。請檢查是否有大檔誤入 public/、或依賴過重。\n');
  process.exit(1);
}

if (mb > WARN_MB) {
  console.warn(`\n[check-size] ⚠ standalone 產物 ${mb}MB，已接近 ${LIMIT_MB}MB 上限。\n`);
} else {
  console.log(`[check-size] ✓ standalone 產物 ${mb}MB（上限 ${LIMIT_MB}MB）`);
}
