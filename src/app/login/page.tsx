import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";
import AuthCard from "@/components/AuthCard";
import PageTitle from "@/components/PageTitle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.teamId ? "/" : "/onboarding/team");

  const { error } = await searchParams;

  return (
    <AuthCard>
      <PageTitle>ログイン</PageTitle>

      {error && <p className="banner-error mb-5">{error}</p>}

      <form action={loginAction} className="flex flex-col gap-5">
        {/* 完成イメージはラベルが入力欄の左に並ぶ形。 */}
        <div className="grid grid-cols-[5.5rem,1fr] items-center gap-x-4 gap-y-4">
          <label className="field-label mb-0 text-right" htmlFor="loginId">
            ID
          </label>
          <input
            id="loginId"
            name="loginId"
            type="text"
            autoComplete="username"
            required
            className="field-input"
          />

          <label className="field-label mb-0 text-right" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field-input"
          />
        </div>

        <Link
          href="/login/forgot"
          className="self-end text-sm text-accent underline underline-offset-2 hover:text-accent-strong"
        >
          パスワードを忘れた方はこちら
        </Link>

        <button type="submit" className="btn-primary mt-1 self-end px-12">
          ログイン
        </button>

        <Link
          href="/signup"
          className="self-end text-sm font-bold text-matcha underline underline-offset-2 hover:text-matcha-deep"
        >
          新規登録はこちらから
        </Link>
      </form>
    </AuthCard>
  );
}
