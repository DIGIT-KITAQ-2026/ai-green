"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";
import Mascot from "./Mascot";
import { Icon, IconName } from "./IconSprite";
import LevelUpModal from "./LevelUpModal";
import { logoutAction } from "@/app/actions/auth";

// 並び順はホーム画面のタイルと揃えている（片方だけ変えると迷うため）。
// チャットが主機能なので先頭。設定はタイルに無いので最後に置く。
const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/chat", label: "チャット", icon: "chat" },
  { href: "/tasks", label: "業務内容", icon: "book" },
  { href: "/team-notes", label: "みんなのメモ", icon: "shared-note" },
  { href: "/calendar", label: "カレンダー", icon: "calendar" },
  { href: "/notes", label: "メモ", icon: "note" },
  { href: "/character", label: "キャラクター", icon: "star" },
  { href: "/settings", label: "設定", icon: "gear" },
];

const STORAGE_KEY = "shincha:sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type SideNavLevel = {
  level: number;
  totalXp: number;
  progress: number;
  isMax: boolean;
  remaining: number;
};

/**
 * 完成イメージ（4〜6ページ目）の左サイドバー。
 * 濃緑の帯にロゴ・マスコット・白いナビボタンを縦に並べる。
 *
 * 画面を広く使いたいときのために折りたためるようにしてあり、
 * 開閉の状態はブラウザに覚えさせる。
 * 画面が狭いときは同じ配色のまま上部の横並びバーに切り替える。
 */
export default function SideNav({
  displayName,
  mascotAccent,
  mascotSrc,
  level,
}: {
  displayName: string;
  mascotAccent?: string;
  mascotSrc?: string;
  level: SideNavLevel;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // localStorage は描画後にしか読めないので、開いた状態で描いてから合わせる。
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      // プライベートモードなどで読めなくても既定（開いた状態）で動けばよい
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // 保存できなくても開閉自体は動く
      }
      return next;
    });
  }

  return (
    <>
      <LevelUpModal level={level.level} />

      {/* デスクトップ: 左の緑サイドバー */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-matcha py-6 text-white transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[4.75rem] px-2.5" : "w-60 px-5"
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          title={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          className={`mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 ${
            collapsed ? "self-center" : "self-end"
          }`}
        >
          <Icon
            name="back"
            className={`h-4 w-4 ${collapsed ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>

        <Link
          href="/"
          className="flex flex-col items-center gap-4 transition hover:opacity-90"
          title="ホーム"
        >
          {!collapsed && <BrandLogo size="md" />}
          <Mascot
            size={collapsed ? 44 : 116}
            accent={mascotAccent}
            src={mascotSrc}
            priority
          />
        </Link>

        {/* レベルと経験値 */}
        <div className={`mt-3 ${collapsed ? "text-center" : ""}`}>
          {collapsed ? (
            <p className="text-[11px] font-bold text-white/90">Lv.{level.level}</p>
          ) : (
            <>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold">レベル {level.level}</span>
                <span className="text-[10px] text-white/75">{level.totalXp} XP</span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/25"
                role="progressbar"
                aria-valuenow={level.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`レベル${level.level}の進捗`}
              >
                <div
                  className="h-full rounded-full bg-folder"
                  style={{ width: `${Math.max(level.progress, 3)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-white/75">
                {level.isMax
                  ? "最大レベル"
                  : `あと ${level.remaining} XP で レベル${level.level + 1}`}
              </p>
            </>
          )}
        </div>

        <nav className={`mt-6 flex flex-col ${collapsed ? "gap-2" : "gap-2.5"}`}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={`side-link ${active ? "side-link-active" : ""} ${
                  collapsed
                    ? "flex h-11 items-center justify-center px-0"
                    : "flex items-center gap-2.5 px-3 text-left"
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 text-center">
          {!collapsed && (
            <p className="mb-2 text-xs leading-relaxed text-white/80">{displayName}</p>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              title="ログアウト"
              aria-label="ログアウト"
              className={
                collapsed
                  ? "mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
                  : "text-xs font-bold text-white/80 underline underline-offset-4 transition hover:text-white"
              }
            >
              {collapsed ? (
                <Icon name="back" className="h-4 w-4" strokeWidth={2} />
              ) : (
                "ログアウト"
              )}
            </button>
          </form>
        </div>
      </aside>

      {/* モバイル: 上部の緑バー */}
      <header className="sticky top-0 z-20 bg-matcha px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Mascot size={40} accent={mascotAccent} src={mascotSrc} priority />
            <BrandLogo size="sm" />
          </Link>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">
            Lv.{level.level}
          </span>
          <form action={logoutAction} className="ml-auto">
            <button
              type="submit"
              className="text-xs font-bold text-white/80 underline underline-offset-4"
            >
              ログアウト
            </button>
          </form>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`side-link flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 ${
                isActive(pathname, item.href) ? "side-link-active" : ""
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
