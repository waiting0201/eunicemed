import type { ReactNode } from 'react';
import './globals.css';

/**
 * 根 layout 只提供 html/body 外殼。
 * 實際的 lang 屬性與導覽在 app/[locale]/layout.tsx 決定 —— 所有路由都帶語系前綴，
 * 這一層不會單獨被渲染（middleware 會先把沒帶前綴的請求導走）。
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
