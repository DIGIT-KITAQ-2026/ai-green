import BrandLogo from "./BrandLogo";
import Mascot from "./Mascot";

/**
 * ログイン・新規登録・所属選択で使う2カラムのシェル。
 * 完成イメージ（1〜2ページ目）どおり、左は濃緑のブランド面に
 * ロゴとマスコット、右は白地のフォーム。
 */
export default function AuthCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-8 sm:px-6 sm:py-12">
      <div className="card flex w-full max-w-4xl flex-col overflow-hidden sm:flex-row">
        <div className="flex flex-col items-center justify-center gap-6 bg-matcha px-6 py-9 text-white sm:w-[38%] sm:py-14">
          <BrandLogo size="lg" />
          <Mascot size={170} priority />
        </div>
        <div className="flex-1 px-7 py-9 sm:px-10 sm:py-12">{children}</div>
      </div>
    </div>
  );
}
