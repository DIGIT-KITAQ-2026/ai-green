import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signupAction } from "@/app/actions/auth";
import AuthCard from "@/components/AuthCard";
import PageTitle from "@/components/PageTitle";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.teamId ? "/" : "/onboarding/team");

  const { error } = await searchParams;

  return (
    <AuthCard>
      <PageTitle>新規登録</PageTitle>

      {error && <p className="banner-error mb-5">{error}</p>}

      <form action={signupAction} className="flex flex-col gap-4">
        <div>
          <label className="field-label" htmlFor="name">
            氏名
          </label>
          <input id="name" name="name" type="text" required className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="loginId">
            ID（社員ID・メールアドレスなど）
          </label>
          <input
            id="loginId"
            name="loginId"
            type="text"
            autoComplete="username"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            パスワード（8文字以上）
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="field-input"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-4">
          <Link
            href="/login"
            className="text-sm font-bold text-matcha underline underline-offset-2 hover:text-matcha-deep"
          >
            ログイン画面へ戻る
          </Link>
          <button type="submit" className="btn-primary">
            登録して次へ
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
