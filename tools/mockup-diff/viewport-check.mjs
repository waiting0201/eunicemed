#!/usr/bin/env node
/**
 * 量測每頁在各視窗寬度下是否有橫向溢出 —— 手機版壞掉最典型、也最好抓的症狀。
 *
 * 需要先開一個帶遠端偵錯埠的 Chrome：
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
 *     --remote-debugging-port=9222 --user-data-dir=/tmp/cdp about:blank &
 *
 * 用法：
 *   node tools/mockup-diff/viewport-check.mjs http://localhost:3123 "/en,/en/products" "390,768,1280"
 *
 * Node 22+ 內建 WebSocket，所以不需要 puppeteer 之類的相依。
 */
const [, , base, pathsCsv, widthsCsv] = process.argv;
const paths = pathsCsv.split(',');
const widths = widthsCsv.split(',').map(Number);

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send('Page.enable');
await send('Runtime.enable');

const results = [];
for (const w of widths) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: w,
    height: 900,
    deviceScaleFactor: 1,
    mobile: w <= 640,
  });
  for (const p of paths) {
    await send('Page.navigate', { url: base + p });
    await new Promise((r) => setTimeout(r, 1200));
    const resp = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const de = document.documentElement;
        const over = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > window.innerWidth + 1 || r.left < -1) {
            const cs = getComputedStyle(el);
            if (cs.position === 'fixed') continue;
            over.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0,40),
              dr: el.getAttribute('data-r') || '',
              left: Math.round(r.left), right: Math.round(r.right),
              gtc: cs.gridTemplateColumns.slice(0,60),
            });
          }
        }
        return {
          scrollW: de.scrollWidth, innerW: window.innerWidth,
          navVisible: !!document.querySelector('[data-r~="only-mobile"]') &&
                      getComputedStyle(document.querySelector('[data-r~="only-mobile"]')).display !== 'none',
          deskNav: (() => { const n = document.querySelector('header nav'); return n ? getComputedStyle(n).display : 'absent'; })(),
          over: over.slice(0, 6),
        };
      })()`,
    });
    const value = resp?.result?.result?.value;
    if (!value) {
      console.error('RAW:', JSON.stringify(resp).slice(0, 300));
      continue;
    }
    results.push({ w, p, ...value });
  }
}
for (const r of results) {
  const bad = r.scrollW > r.innerW + 1;
  console.log(
    `${String(r.w).padStart(4)}px ${r.p.padEnd(34)} scrollW=${r.scrollW} inner=${r.innerW} ${bad ? '❌ 橫向溢出' : '✓'}  hamburger=${r.navVisible} deskNav=${r.deskNav}`,
  );
  if (bad)
    for (const o of r.over)
      console.log(`        ${o.tag} data-r="${o.dr}" ${o.left}→${o.right} gtc=${o.gtc}`);
}
ws.close();
