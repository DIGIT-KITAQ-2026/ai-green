/**
 * 所属チームごとのフォルダ色。
 *
 * 当初はチームIDのハッシュで決めていたが、チーム数が少なくても衝突して
 * 別チームが同じ色になることがあったため、「作られた順に前から配る」方式にした。
 * 作成順は変わらないので、チームが増えても既存チームの色は変わらない。
 * 文字は濃い色（ink）を載せるため、どれも明るめの色にしてある。
 */

export type TeamColor = {
  /** フォルダ本体 */
  body: string;
  /** 上部のつまみ（本体より少し濃く） */
  tab: string;
  /** 一覧のチップなどに使う点 */
  dot: string;
};

export const TEAM_PALETTE: TeamColor[] = [
  { body: "#FBBF02", tab: "#EDAE00", dot: "#FBBF02" }, // 山吹
  { body: "#89C7EA", tab: "#6EB4DE", dot: "#89C7EA" }, // 空
  { body: "#F2A1A1", tab: "#E88B8B", dot: "#F2A1A1" }, // 珊瑚
  { body: "#94D3AC", tab: "#7BC496", dot: "#94D3AC" }, // 若草
  { body: "#BBA8E2", tab: "#A891D7", dot: "#BBA8E2" }, // 藤
  { body: "#F5CA8D", tab: "#EDB96E", dot: "#F5CA8D" }, // 杏
  { body: "#8FD8D2", tab: "#74C9C2", dot: "#8FD8D2" }, // 浅葱
  { body: "#E8AFD2", tab: "#DC98C2", dot: "#E8AFD2" }, // 撫子
  { body: "#C6D68C", tab: "#B4C673", dot: "#C6D68C" }, // 若葉
  { body: "#AFBEE4", tab: "#96A8D9", dot: "#AFBEE4" }, // 勿忘草
];

/**
 * チームIDから色を引くための対応表を作る。
 * teamIds は「作成順」で渡すこと（順番が色の割り当てになる）。
 * パレットを超えた分は先頭に戻る。
 */
export function buildTeamColorMap(teamIds: string[]): Map<string, TeamColor> {
  return new Map(
    teamIds.map((id, i) => [id, TEAM_PALETTE[i % TEAM_PALETTE.length]]),
  );
}

/** 対応表に無いチーム（想定外）でも表示が壊れないようにする既定色。 */
export const DEFAULT_TEAM_COLOR: TeamColor = TEAM_PALETTE[0];
