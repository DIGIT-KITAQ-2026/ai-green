import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";
import AuthCard from "@/components/AuthCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.teamId ? "/" : "/onboarding/team");

  const { error } = await searchParams;

  return (
    <AuthCard big>
      <h1 className="mb-6 inline-block border-b-2 border-tea pb-1 text-xl font-semibold">
        ログイン
      </h1>

      {error && <p className="banner-error mb-4">{error}</p>}

      <form action={loginAction} className="flex flex-col gap-4">
        <div>
          <label className="field-label" htmlFor="loginId">
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
        </div>
        <div>
          <label className="field-label" htmlFor="password">
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
          className="-mt-2 text-sm text-inksoft underline underline-offset-2"
        >
          パスワードを忘れた方はこちら
        </Link>

        <div className="mt-2 flex flex-col gap-3">
          <Link href="/signup" className="btn-secondary">
            新規登録はこちら
          </Link>
          <button type="submit" className="btn-primary">
            ログイン
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
