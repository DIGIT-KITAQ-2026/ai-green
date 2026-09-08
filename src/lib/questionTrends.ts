import { prisma } from "./db";

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
 */
export async function computeQuestionTrend(userId: string): Promise<QuestionTrend> {
  const messages = await prisma.chatMessage.findMany({
    where: { userId, role: "assistant" },
    select: { referencedTaskEntryId: true },
  });

  const total = messages.length;
  if (total === 0) return { items: [], total: 0 };

  const countByEntryId = new Map<string, number>();
  let noReference = 0;
  for (const m of messages) {
    if (!m.referencedTaskEntryId) {
      noReference++;
      continue;
    }
    countByEntryId.set(
      m.referencedTaskEntryId,
      (countByEntryId.get(m.referencedTaskEntryId) ?? 0) + 1,
    );
  }

  const entries = countByEntryId.size
    ? await prisma.taskEntry.findMany({
        where: { id: { in: [...countByEntryId.keys()] } },
        select: { id: true, title: true },
      })
    : [];
  const titleById = new Map(entries.map((e) => [e.id, e.title]));

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
