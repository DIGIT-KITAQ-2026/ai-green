import Link from "next/link";
import { DEFAULT_TEAM_COLOR, TeamColor } from "@/lib/teamColors";

/**
 * 業務内容一覧のカード。完成イメージ4ページ目の
 * 黄色いフォルダを、画像を使わずタブ＋本体の2枚の面で表している。
 * 色は所属チームごとに変えて、一覧の中で見分けやすくしている。
 */
export default function FolderCard({
  href,
  title,
  teamName,
  summary,
  color = DEFAULT_TEAM_COLOR,
}: {
  href: string;
  title: string;
  teamName: string;
  summary: string;
  color?: TeamColor;
}) {
  return (
    <Link href={href} className="group block h-full">
      <div className="relative h-full pt-3 transition group-hover:-translate-y-1">
        {/* フォルダのつまみ */}
        <div
          className="absolute left-4 top-0 h-4 w-1/3 rounded-t-lg"
          style={{ backgroundColor: color.tab }}
        />
        <div
          className="relative flex h-full min-h-[8.5rem] flex-col gap-1.5 rounded-xl rounded-tl-sm px-4 py-3.5 shadow-lift"
          style={{ backgroundColor: color.body }}
        >
          <p className="text-xs font-bold text-ink/70">{teamName}</p>
          <p className="font-display font-black leading-snug text-ink">{title}</p>
          <p className="line-clamp-3 text-xs leading-relaxed text-ink/75">
            {summary}
          </p>
        </div>
      </div>
    </Link>
  );
}
