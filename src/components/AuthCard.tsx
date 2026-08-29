import { Icon } from "./IconSprite";

/**
 * ログイン・所属選択・登録画面などで使う2カラムのシェル。
 * 左に湯呑みマスコットのブランド表示、右にフォーム本体を置く
 * （仕様書のワイヤーフレーム通り）。
 */
export default function AuthCard({
  brandLabel = "しんちゃ",
  big = false,
  children,
}: {
  brandLabel?: string;
  big?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card flex w-full max-w-3xl overflow-hidden">
        <div className="flex w-[34%] min-w-[140px] flex-col items-center justify-center gap-3 border-r border-line bg-surface px-4 py-10 text-center">
          <Icon
            name="cup-face"
            className={big ? "h-16 w-16 text-tea" : "h-11 w-11 text-tea"}
          />
          <span className="font-display text-lg font-semibold">
            {brandLabel}
          </span>
        </div>
        <div className="flex-1 p-8 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
