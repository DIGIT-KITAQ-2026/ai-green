import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import PageTitle from "@/components/PageTitle";

export default function ForgotPasswordPage() {
  return (
    <AuthCard>
      <PageTitle>パスワード再設定</PageTitle>
      <p className="mb-7 leading-relaxed text-inksoft">
        このMVP版では、メールによるパスワード再設定は未実装です。
        <br />
        お手数ですが、管理者（先輩社員）にアカウントのパスワード再設定を依頼してください。
      </p>
      <Link href="/login" className="btn-primary">
        ログイン画面へ戻る
      </Link>
    </AuthCard>
  );
}
