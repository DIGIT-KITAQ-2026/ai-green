import type { QuestionTrend } from "@/lib/questionTrends";

/**
 * 「質問の傾向」グラフ。業務内容ごとに横棒を1本ずつ並べるランキング形式。
 * 既存のレベル進捗バー（SideNav/キャラクター画面）と同じ、CSSだけの素朴な作り。
 */
export default function QuestionTrendChart({
  title,
  trend,
  emptyMessage = "まだ質問の履歴がありません。",
}: {
  title: string;
  trend: QuestionTrend;
  emptyMessage?: string;
}) {
  return (
    <div className="card rounded-tile p-5">
      <h3 className="section-title mb-3">{title}</h3>

      {trend.items.length === 0 ? (
        <p className="text-sm text-inkfaint">{emptyMessage}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {trend.items.map((item) => (
              <li key={item.label}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold text-ink">{item.label}</span>
                  <span className="shrink-0 text-xs text-inkfaint">
                    {item.count}件・{item.percent}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-matcha-soft">
                  <div
                    className="h-full rounded-full bg-matcha"
                    style={{ width: `${Math.max(item.percent, 2)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-inkfaint">
            合計 {trend.total} 件の質問から集計
          </p>
        </>
      )}
    </div>
  );
}
