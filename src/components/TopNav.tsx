import Link from "next/link";
import { Icon } from "./IconSprite";
import { logoutAction } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/tasks", label: "業務内容", icon: "book" as const },
  { href: "/manual", label: "マニュアル", icon: "person" as const },
  { href: "/chat", label: "チャット", icon: "chat" as const },
  { href: "/settings", label: "設定", icon: "gear" as const },
];

export default function TopNav({
  displayName,
}: {
  displayName: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Icon name="cup" className="h-7 w-7 text-tea" />
          <span className="font-display text-lg font-semibold leading-none">
            新-cha-
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold
                text-inksoft transition hover:bg-tea-soft hover:text-tea-strong"
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden font-mono text-xs text-inkfaint sm:inline">
            {displayName}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
