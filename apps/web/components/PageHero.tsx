/**
 * 頁首標題塊：eyebrow + h1 + lead，置中。
 * mockup4 的 FAQ / Downloads / Where to Buy / Applications 都是同一組，
 * 所以抽出來 —— 這是版型元素，文案由各頁依語系提供。
 */
export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <section className="mx-auto max-w-[--container-content] px-6 pt-10 lg:px-16">
      <div className="mx-auto max-w-[760px] text-center">
        <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[--color-brand-deep]">
          {eyebrow}
        </p>
        <h1 className="mt-2.5 text-[clamp(2rem,3.6vw,2.8rem)] font-normal">{title}</h1>
        {lead && <p className="mt-3.5 text-[1.1rem]">{lead}</p>}
      </div>
    </section>
  );
}
