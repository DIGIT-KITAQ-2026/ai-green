import Link from "next/link";
import AuthCard from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  return (
    <AuthCard>
      <h1 className="mb-6 inline-block border-b-2 border-tea pb-1 text-xl font-semibold">
        パスワードをお忘れの方へ
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-inksoft">
        このMVP版では、メールによるパスワード再設定は未実装です。
        <br />
        お手数ですが、管理者（先輩社員）にアカウントのパスワード再設定を依頼してください。
      </p>
      <Link href="/login" className="btn-secondary inline-flex">
        ログイン画面へ戻る
      </Link>
    </AuthCard>
  );
}
