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
            ID（メールアドレス）
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

        {/*
          役割は登録時に自分で選ぶ。
          新人は閲覧と質問、先輩・管理者はそれに加えて業務内容の登録・削除と
          メンバー管理ができる。あとから設定 > メンバー管理でも変えられる。
        */}
        <fieldset>
          <legend className="field-label">登録する役割</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              {
                value: "member",
                label: "新人",
                note: "業務内容を見る・AIに質問する",
                defaultChecked: true,
              },
              {
                value: "admin",
                label: "先輩・管理者",
                note: "業務内容の登録・削除、メンバー管理もできる",
                defaultChecked: false,
              },
            ].map((option) => (
              <label
                key={option.value}
                className="group flex cursor-pointer gap-2.5 rounded-xl border-2 border-line bg-surface p-3 transition hover:border-matcha has-[:checked]:border-matcha has-[:checked]:bg-matcha-soft"
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  defaultChecked={option.defaultChecked}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-matcha"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-inksoft">
                    {option.note}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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
