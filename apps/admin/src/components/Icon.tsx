/**
 * 圖示。stroke-only、1.5 線寬，尺寸與線重由 `.icon` 系列 class 控制
 * —— 慣例對齊 Jabez/Admin 的 `.sa-icon`，但這裡是 inline SVG 而非 sprite 檔：
 * 只有用到的圖示會進 bundle，也不必維護一個雪碧圖。
 */
const PATHS = {
  layers: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
  body: <><circle cx="12" cy="5" r="2.5" /><path d="M12 8v7M8 21l4-6 4 6M7 11h10" /></>,
  file: <><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3M12 17h.01" /></>,
  download: <><path d="M12 3v11" /><path d="m8 11 4 4 4-4M5 20h14" /></>,
  pin: <><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  tag: <><path d="M3 12V4h8l9 9-8 8-9-9Z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
  grade: <><path d="M4 18h4V9H4zM10 18h4V5h-4zM16 18h4v-6h-4z" /></>,
  seal: <><path d="M12 3 19 6v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><path d="m9 12 2 2 4-4.5" /></>,
  image: <><path d="M3 5h18v14H3z" /><circle cx="8.5" cy="10" r="1.5" /><path d="m3 17 5-4 4 3 3-2 6 5" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  arrows: <><path d="M4 8h12l-3-3M20 16H8l3 3" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 5M17.5 20a6.4 6.4 0 0 0-2-4.6" /></>,
  panelLeft: <><path d="M3 5h18v14H3z" /><path d="M10 5v14" /></>,
  logout: <><path d="M14 4H6v16h8" /><path d="m16 8 4 4-4 4M20 12H10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 13 4 4L19 7" />,
  back: <path d="M15 5l-7 7 7 7" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'icon' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
