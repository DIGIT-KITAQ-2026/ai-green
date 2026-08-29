import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signupAction } from "@/app/actions/auth";
import AuthCard from "@/components/AuthCard";

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
      <h1 className="mb-6 inline-block border-b-2 border-tea pb-1 text-xl font-semibold">
        新規登録
      </h1>

      {error && <p className="banner-error mb-4">{error}</p>}

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

        <div className="mt-2 flex flex-col gap-3">
          <button type="submit" className="btn-primary">
            登録して次へ（所属選択）
          </button>
          <Link href="/login" className="btn-ghost">
            ログイン画面へ戻る
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
