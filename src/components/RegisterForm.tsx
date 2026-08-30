import Link from "next/link";
import { Icon } from "./IconSprite";
import TeamPicker from "./TeamPicker";
import Dropzone from "./Dropzone";
import SubmitButton from "./SubmitButton";
import PageTitle from "./PageTitle";
import { createTaskEntryAction } from "@/app/actions/tasks";

/**
 * 業務内容の登録画面。完成イメージ5ページ目に対応。
 * 大きなドロップゾーンを主役に置き、右下に青い「登録」ボタンを配置する。
 */
export default function RegisterForm({
  teams,
  defaultTeamId,
  errorMessage,
}: {
  teams: { id: string; name: string }[];
  defaultTeamId?: string;
  errorMessage?: string;
}) {

  return (
    <div>
      <PageTitle>新規登録</PageTitle>

      {errorMessage && <p className="banner-error mb-5">{errorMessage}</p>}

      <form action={createTaskEntryAction} className="flex flex-col gap-6">
        <div>
          <label className="field-label" htmlFor="title">
            業務内容名
          </label>
          <input id="title" name="title" required className="field-input" />
        </div>

        <div>
          <span className="field-label">チーム</span>
          <TeamPicker teams={teams} defaultTeamId={defaultTeamId} />
        </div>

        <div>
          <span className="field-label">添付ファイル（画像 / PDF）</span>
          <Dropzone />
          <p className="mt-2 text-xs text-inkfaint">
            添付内容をAIが読み取り、要約と検索用テキストを自動生成します。
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Link href="/tasks" className="btn-ghost">
            <Icon name="back" className="h-4 w-4" />
            戻る
          </Link>
          <SubmitButton pendingLabel="AIが内容を読み取り中…" className="btn-primary px-14">
            登録
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
