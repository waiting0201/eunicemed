import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // 後台 SPA 的打包產物。它放在 public/ 底下是為了跟公開站一起部署，
      // 但那是編譯結果不是原始碼 —— 不排除的話 lint 會去檢查壓縮過的 JS，
      // 報出上百個與這個 repo 無關的錯（CI 會直接紅掉）
      'public/admin/**',
    ],
  },
  {
    rules: {
      // 本站刻意用原生 <img> 而非 next/image：圖片直接指向 Blob 上已產生的
      // 尺寸變體，srcSet 要完全自己掌握（見 lib/image.ts 與 docs/07 §7.3）。
      // 這是架構決定，29 個提醒只會蓋掉真正該看的警告。
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
