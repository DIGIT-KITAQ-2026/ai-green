/**
 * 育成要素（経験値・レベル・もらえるキャラクター）の定義。
 *
 * 経験値はユーザーの行動に対して付与し、User.xp に貯める。
 * 「あとから減らない」ようにしたいので、集計ではなく加算で持っている
 * （会話を消しても、消化したToDoを戻しても、経験値は減らない）。
 */

/** 行動ごとの獲得経験値。 */
export const XP_RULES = {
  /** チャットで質問する */
  question: 10,
  /** ToDoを完了する（1件につき1回だけ） */
  todoDone: 15,
  /** 業務内容を登録する（みんなの役に立つので多め） */
  entryCreated: 25,
} as const;

export const XP_RULE_LABELS: { label: string; xp: number }[] = [
  { label: "チャットで質問する", xp: XP_RULES.question },
  { label: "ToDoを1つ終わらせる", xp: XP_RULES.todoDone },
  { label: "業務内容を登録する", xp: XP_RULES.entryCreated },
];

/** レベル L から L+1 に上がるのに必要な経験値。 */
function stepFor(level: number): number {
  return 50 + 30 * (level - 1);
}

const MAX_LEVEL = 10;

/** レベル L に到達するのに必要な累計経験値。 */
export function thresholdFor(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += stepFor(l);
  return total;
}

export type LevelInfo = {
  level: number;
  /** 現在レベルの中で貯まっている分 */
  currentXp: number;
  /** 次のレベルまでに必要な分（最大レベルなら0） */
  neededXp: number;
  /** 0〜100 の進捗 */
  progress: number;
  isMax: boolean;
  totalXp: number;
};

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= thresholdFor(level + 1)) level++;

  const base = thresholdFor(level);
  if (level >= MAX_LEVEL) {
    return { level, currentXp: 0, neededXp: 0, progress: 100, isMax: true, totalXp };
  }
  const need = stepFor(level);
  const current = totalXp - base;
  return {
    level,
    currentXp: current,
    neededXp: need,
    progress: Math.min(100, Math.round((current / need) * 100)),
    isMax: false,
    totalXp,
  };
}

export type Reward = {
  id: string;
  name: string;
  kind: "character" | "costume";
  requiredLevel: number;
  description: string;
  /** イラストが用意できるまでの見分け用に、丸の背景色を変えている。 */
  accent: string;
  /**
   * 将来ここに public/ 配下の画像パスを入れると、そのまま表示に使われる。
   * 未設定のうちは既定のマスコット画像＋accent色で代用する。
   */
  image?: string;
};

/**
 * もらえるキャラクター・着せ替えの一覧。お茶にちなんだ名前で揃えている。
 * イラストが増えたら image を足すだけで反映される。
 */
export const REWARDS: Reward[] = [
  {
    id: "default",
    name: "しんちゃ",
    kind: "character",
    requiredLevel: 1,
    description: "はじめからいっしょにいる、湯呑みの中の案内役。",
    accent: "#FFFFFF",
  },
  {
    id: "sakura",
    name: "さくらしんちゃ",
    kind: "costume",
    requiredLevel: 2,
    description: "ほんのり桜色の装い。はじめての着せ替え。",
    accent: "#FBE4EC",
    image: "/sakura-shincha.png",
  },
  {
    id: "latte",
    name: "ラテしんちゃ",
    kind: "costume",
    requiredLevel: 3,
    description: "ミルクをそそいだまろやかな装い。",
    accent: "#F5E7D0",
  },
  {
    id: "hojicha",
    name: "ほうじちゃ先輩",
    kind: "character",
    requiredLevel: 4,
    description: "香ばしくて落ち着いた先輩。少し低い声で教えてくれる。",
    accent: "#E4D3BE",
  },
  {
    id: "sencha",
    name: "せんちゃ",
    kind: "character",
    requiredLevel: 6,
    description: "きりっとした煎茶の子。仕事が早い。",
    accent: "#DCE9CE",
  },
  {
    id: "gyokuro",
    name: "ぎょくろ様",
    kind: "character",
    requiredLevel: 8,
    description: "めったに出てこない玉露。会えたらかなりの上級者。",
    accent: "#FBF0C9",
  },
];

export function rewardById(id: string | null | undefined): Reward {
  return REWARDS.find((r) => r.id === id) ?? REWARDS[0];
}

export function isUnlocked(reward: Reward, level: number): boolean {
  return level >= reward.requiredLevel;
}

/** そのレベルで新しく解放されたものを返す（レベルアップの告知に使う）。 */
export function rewardsAtLevel(level: number): Reward[] {
  return REWARDS.filter((r) => r.requiredLevel === level);
}
