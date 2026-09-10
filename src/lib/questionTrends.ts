import { createClient } from "./supabase/server";

const TOP_N = 5;
const NO_REFERENCE_LABEL = "参照なし";
const OTHERS_LABEL = "その他";

export type TrendItem = {
  label: string;
  count: number;
  /** 0〜100の整数（切り捨て）。 */
  percent: number;
};

export type QuestionTrend = {
  items: TrendItem[];
  total: number;
};

/**
 * 1人分の「質問の傾向」＝AIの回答が参照した業務内容ごとの件数を集計する。
 * 上位5件だけを個別表示し、残りは「その他」にまとめる。
 * 参照先が無かった質問（AIが該当なしと答えたもの）も「参照なし」として数える
 * ―― これを抜くと割合が実態より高く出てしまうため。
 *
 * 集計はDBの question_trend 関数に任せている。チャットの本文は本人しか
 * 読めないようにしてあるので、先輩・管理者がメンバーのグラフを見るときも
 * 「どの資料を何回参照したか」だけが返り、質問文や回答文は渡らない。
 */
export async function computeQuestionTrend(userId: string): Promise<QuestionTrend> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("question_trend", {
    p_user_id: userId,
  });
  if (error || !rows) return { items: [], total: 0 };

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  if (total === 0) return { items: [], total: 0 };

  const countByEntryId = new Map<string, number>();
  let noReference = 0;
  for (const r of rows) {
    if (!r.referenced_task_entry_id) {
      noReference += Number(r.count);
      continue;
    }
    countByEntryId.set(r.referenced_task_entry_id, Number(r.count));
  }

  const { data: entries } = countByEntryId.size
    ? await supabase
        .from("task_entries")
        .select("id, title")
        .in("id", [...countByEntryId.keys()])
    : { data: [] };
  const titleById = new Map((entries ?? []).map((e) => [e.id, e.title]));

  type Bucket = { label: string; count: number };
  const buckets: Bucket[] = [...countByEntryId.entries()].map(([id, count]) => ({
    label: titleById.get(id) ?? "(削除された業務内容)",
    count,
  }));
  if (noReference > 0) buckets.push({ label: NO_REFERENCE_LABEL, count: noReference });

  buckets.sort((a, b) => b.count - a.count);

  const top = buckets.slice(0, TOP_N);
  const rest = buckets.slice(TOP_N);
  const restCount = rest.reduce((sum, b) => sum + b.count, 0);
  if (restCount > 0) top.push({ label: OTHERS_LABEL, count: restCount });

  const items: TrendItem[] = top.map((b) => ({
    label: b.label,
    count: b.count,
    percent: Math.floor((b.count / total) * 100),
  }));

  return { items, total };
}
