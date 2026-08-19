import Link from 'next/link';

/**
 * 同層切換列。mockup4「Product Category」的第 2 段：
 * `#F0F6F8` 底、上下細線、**黏在頁首下方**（`top:76px`，剛好是頁首高度），
 * 現在這一項是 ink 字加品牌青底線，其餘 `#44565D`。
 *
 * <p>
 * 最後一項（「All products」）用 `margin-left:auto` 推到最右。
 * </p>
 */
export function SiblingNav({
  items,
  activeHref,
  tail,
}: {
  items: { href: string; label: string }[];
  activeHref: string;
  /** 推到最右的收尾項，如「All products」 */
  tail?: { href: string; label: string };
}) {
  if (items.length === 0) return null;

  return (
    <div className="sticky top-[76px] z-40 border-y border-hairline bg-tint-deep px-gutter">
      <nav className="mx-auto flex max-w-content gap-7 overflow-x-auto text-[0.92rem] font-medium">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`border-b-2 py-4 whitespace-nowrap ${
                active ? 'border-brand text-ink' : 'border-transparent text-body'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {tail && (
          <Link
            href={tail.href}
            className="ml-auto border-b-2 border-transparent py-4 whitespace-nowrap text-body"
          >
            {tail.label}
          </Link>
        )}
      </nav>
    </div>
  );
}
