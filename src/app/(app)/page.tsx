import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Icon, IconName } from "@/components/IconSprite";

const NAV_CARDS: { href: string; label: string; icon: IconName; note: string }[] = [
  {
    href: "/tasks",
    label: "業務内容",
    icon: "book",
    note: "登録された業務を見る・新しい業務を伝える",
  },
  {
    href: "/chat",
    label: "チャット",
    icon: "chat",
    note: "わからないことをAIに質問する",
  },
  {
    href: "/manual",
    label: "マニュアル",
    icon: "person",
    note: "手順書・マニュアルを見る",
  },
  {
    href: "/settings",
    label: "設定",
    icon: "gear",
    note: "プロフィール・パスワードなど",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="card flex min-h-[70vh] overflow-hidden">
      <div className="flex w-[30%] min-w-[160px] flex-col items-center justify-center gap-3 border-r border-line bg-surface px-4 py-10 text-center">
        <Icon name="cup" className="h-16 w-16 text-tea" />
        <div>
          <p className="font-display text-2xl font-semibold">新-cha-</p>
          <p className="font-mono text-xs tracking-wide text-inkfaint">
            NEW-TEA-
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-8">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {NAV_CARDS.map((card) => (
            <Link key={card.href} href={card.href} className="nav-card">
              <Icon name={card.icon} className="h-7 w-7" />
              <span>{card.label}</span>
              <span className="px-4 text-center text-xs font-normal text-inksoft">
                {card.note}
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/settings#nickname"
          className="rounded-lg border border-dashed border-pencil bg-surface2 px-4 py-3 text-center text-sm text-inksoft transition hover:border-tea hover:text-tea-strong"
        >
          呼び方ボタン ── {user?.nickname ? `「${user.nickname}」と呼んでいます` : "マスコットに呼んでほしい名前を設定する"}
        </Link>
      </div>
    </div>
  );
}
