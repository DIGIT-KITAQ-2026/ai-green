import Link from "next/link";
import { Icon } from "./IconSprite";
import TeamPicker from "./TeamPicker";
import Dropzone from "./Dropzone";
import SubmitButton from "./SubmitButton";
import { createTaskEntryAction } from "@/app/actions/tasks";

/** 登録画面（業務内容 / マニュアル 共通）。「とうろく」ワイヤーフレームに対応。 */
export default function RegisterForm({
  type,
  teams,
  defaultTeamId,
  backHref,
  errorMessage,
}: {
  type: "task" | "manual";
  teams: { id: string; name: string }[];
  defaultTeamId?: string;
  backHref: string;
  errorMessage?: string;
}) {
  const label = type === "manual" ? "マニュアル" : "業務内容";

  return (
    <div className="card mx-auto flex max-w-2xl overflow-hidden">
      <div className="flex w-[30%] min-w-[120px] flex-col items-center justify-center gap-3 border-r border-line bg-surface px-4 py-10">
        <Icon name="cup" className="h-11 w-11 text-tea" />
        <span className="font-display text-base font-semibold">しんちゃ</span>
      </div>

      <div className="flex-1 p-8">
        <h1 className="mb-6 inline-block border-b-2 border-tea pb-1 text-xl font-semibold">
          とうろく
        </h1>

        {errorMessage && <p className="banner-error mb-4">{errorMessage}</p>}

        <form action={createTaskEntryAction} className="flex flex-col gap-5">
          <input type="hidden" name="type" value={type} />

          <div>
            <label className="field-label" htmlFor="title">
              {label}名
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
            <p className="mt-1 text-xs text-inkfaint">
              添付内容をAIが読み取り、要約と検索用テキストを自動生成します。
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <Link href={backHref} className="btn-ghost">
              <Icon name="back" className="h-4 w-4" />
              戻る
            </Link>
            <SubmitButton pendingLabel="AIが内容を読み取り中…" className="btn-primary flex-1">
              登録
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
