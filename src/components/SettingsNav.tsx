import Link from "next/link";

/**
 * 設定画面の項目ナビ。項目が増えても迷わないよう、左に見出しを並べる。
 * 画面が狭いときは上に横並びで置く。
 */
export default function SettingsNav({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  return (
    <nav className="lg:sticky lg:top-8">
      <p className="mb-2.5 hidden px-1 text-xs font-bold text-inkfaint lg:block">
        設定項目
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <Link
              href={`#${item.id}`}
              className="block whitespace-nowrap rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-bold text-inksoft transition hover:border-matcha hover:text-matcha lg:border-transparent lg:bg-transparent"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
