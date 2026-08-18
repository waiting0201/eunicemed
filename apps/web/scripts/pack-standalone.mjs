import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 把 `next build --output standalone` 的產物整理成 SWA 收得下的形狀。
 *
 * <p>
 * 兩件事：
 * </p>
 * <list type="number">
 * <item>把 `.next/static` 與 `public/` 複製進 standalone —— Next 不會自己放，
 *       少了它們部署後 CSS、字型與圖片全部 404，而 build 完全成功。</item>
 * <item>**壓平 pnpm workspace 造成的兩層巢狀**。SWA 找的是
 *       `.next/standalone/server.js`；在 workspace 下它會被放到
 *       `.next/standalone/apps/web/server.js`，SWA 找不到入口，
 *       部署會走到最後才回「Web app warm up timed out」。</item>
 * </list>
 *
 * <p>
 * ⚠️ 不要改用 `outputFileTracingRoot` 來避免巢狀 —— 那會讓 pnpm 的相依落在
 * tracing 範圍外，Next 只留下指向外部的符號連結，SWA 打包時直接失敗
 * （`Could not find file .../node_modules/react`）。見 next.config.ts 的說明。
 * </p>
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const standalone = join(root, '.next', 'standalone');
const nested = join(standalone, 'apps', 'web');

if (!existsSync(standalone)) {
  console.error('[pack-standalone] 找不到 .next/standalone —— next.config 是否還設著 output: standalone？');
  process.exit(1);
}

// workspace 下才有巢狀；非 workspace 建置時 server.js 本來就在根
const appDir = existsSync(nested) ? nested : standalone;

cpSync(join(root, '.next', 'static'), join(appDir, '.next', 'static'), { recursive: true });
cpSync(join(root, 'public'), join(appDir, 'public'), { recursive: true });

if (appDir !== standalone) {
  // node_modules 已經在 standalone 根（tracing 從 repo 根複製進來的實體檔案），
  // 這裡只把 app 自己的檔案往上搬，不要動它
  cpSync(appDir, standalone, { recursive: true });
  rmSync(join(standalone, 'apps'), { recursive: true, force: true });
}

if (!existsSync(join(standalone, 'server.js'))) {
  console.error('[pack-standalone] 壓平後仍找不到 server.js —— SWA 會以 warm up timeout 失敗。');
  process.exit(1);
}

console.log('[pack-standalone] ✓ standalone 已就緒（server.js 在根目錄）');
