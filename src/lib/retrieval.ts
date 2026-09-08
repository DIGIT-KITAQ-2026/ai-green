/**
 * 業務内容の検索（候補の絞り込み）。
 *
 * 仕様書ではベクトル埋め込みによる類似度検索(RAG)を想定しているが、
 * 外部の埋め込みAPI・ベクトルDBを追加せず、文字bi-gramで候補を絞り込む。
 * 絞り込んだ候補はAI（Claude）に渡し、最終的な選定と回答生成はAIに任せる。
 *
 * 【スコアの決め方】
 * 当初は Dice係数（2×一致数 ÷ (クエリ語数+文書語数)）を使っていたが、
 * 文書側のbi-gram数がクエリの20倍以上あるため、スコアが「文書の長さ」に
 * 支配され、「です」「して」のような機能語の偶然の一致で順位が決まっていた。
 * （無関係な資料が1位に来る状態だった）
 *
 * そこで次の2点に変えている。
 *   1. 正規化をクエリ側だけにする（被覆率）。文書の長さで有利不利が出ない。
 *   2. bi-gramをIDFで重み付けする。どの文書にも出る語は効かなくする。
 * さらに、タイトルに含まれる語は本文より強く効くようにしている。
 *
 * 【みんなのメモを手がかりに使う】
 * 共有メモには「新人が実際に使った言葉」と「その人が辿り着いた資料」の対応が
 * 記録されている。これを hints として渡すと、資料本体に出てこない言い回しでも
 * 該当資料を拾えるようになる。
 * ただし hints はあくまで道案内で、AIに渡すのは資料そのもの。
 * メモの本文を回答の根拠にはしない（原典から内容がブレないようにするため）。
 *
 * 将来、本格的なベクトル検索に置き換える場合もこの関数のインターフェースは
 * 変えずに済むよう、呼び出し側は「クエリ文字列→候補配列」の形だけに依存する。
 */

/** どこに出てきた語かで重みを変える。タイトル一致が一番強い。 */
const WEIGHT_TITLE = 1;
const WEIGHT_SUMMARY = 0.6;
const WEIGHT_RAWTEXT = 0.4;

/**
 * 手がかり（みんなのメモ）経由でのスコアに掛ける係数。
 * 1未満にしてあるので、資料そのものが直接ヒットしていればそちらが必ず勝つ。
 * 資料側がまったくヒットしないときの救済として効く。
 */
const HINT_WEIGHT = 0.85;

/**
 * 手がかりが効き始める下限。
 * 短い質問文同士でも、助詞などがたまたま重なるだけで小さなスコアは出る。
 * これを拾うと無関係な資料が押し上がるため、はっきり似ているときだけ効かせる。
 * 係数0.80〜0.90・下限0.25〜0.35の範囲は結果が同じだったので、
 * 両端から離れた0.85／0.35を採った（データが増えても振れにくいように）。
 */
const HINT_MIN_SCORE = 0.35;

function bigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  const grams = new Set<string>();
  if (normalized.length < 2) {
    if (normalized.length === 1) grams.add(normalized);
    return grams;
  }
  for (let i = 0; i < normalized.length - 1; i++) {
    grams.add(normalized.slice(i, i + 2));
  }
  return grams;
}

export type SearchableEntry = {
  id: string;
  title: string;
  summary: string;
  rawText: string;
};

/**
 * 「この言い方をした人は、この資料に辿り着いた」という手がかり。
 *
 * text には過去の質問文を1件だけ入れること。
 * 見出しや本文まで混ぜると文章が長くなり、クエリの文字を偶然多く含んでしまって
 * 無関係な資料が押し上がる（長い文書が勝つ、という以前と同じ失敗になる）。
 * 短い質問文どうしを比べるからこそ「同じような聞き方か」の判定になる。
 */
export type SearchHint = {
  /** 指し示す業務内容のID */
  entryId: string;
  /** 過去の質問文（1件） */
  text: string;
};

type Indexed<T> = {
  entry: T;
  title: Set<string>;
  summary: Set<string>;
  rawText: Set<string>;
};

function indexEntry<T extends SearchableEntry>(entry: T): Indexed<T> {
  return {
    entry,
    title: bigrams(entry.title),
    summary: bigrams(entry.summary),
    rawText: bigrams(entry.rawText),
  };
}

/**
 * 語ごとのIDF。多くの文書に出る語ほど値が小さくなり、順位に効かなくなる。
 * 全文書に出る語でも0にならないよう 1 + N/df の対数にしている。
 */
function buildIdf(indexed: Indexed<SearchableEntry>[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of indexed) {
    const seen = new Set<string>([...doc.title, ...doc.summary, ...doc.rawText]);
    for (const g of seen) df.set(g, (df.get(g) ?? 0) + 1);
  }
  const total = indexed.length;
  const idf = new Map<string, number>();
  for (const [g, count] of df) idf.set(g, Math.log(1 + total / count));
  return idf;
}

/** クエリの語がその文書にどれだけ含まれているかを 0〜1 で返す。 */
function scoreEntry(
  queryGrams: Set<string>,
  doc: Indexed<SearchableEntry>,
  idf: Map<string, number>,
): number {
  let matched = 0;
  let possible = 0;

  for (const g of queryGrams) {
    // コーパスに一度も出ない語は、どの文書とも差が付かないので満点扱いの分母に入れない
    const weight = idf.get(g);
    if (weight === undefined) continue;

    possible += weight * WEIGHT_TITLE;

    if (doc.title.has(g)) matched += weight * WEIGHT_TITLE;
    else if (doc.summary.has(g)) matched += weight * WEIGHT_SUMMARY;
    else if (doc.rawText.has(g)) matched += weight * WEIGHT_RAWTEXT;
  }

  return possible === 0 ? 0 : matched / possible;
}

/** クエリ文字列と最も関連度の高いエントリを上位N件返す。 */
export function rankEntriesByQuery<T extends SearchableEntry>(
  query: string,
  entries: T[],
  topN = 5,
  hints: SearchHint[] = [],
): T[] {
  const queryGrams = bigrams(query);
  if (queryGrams.size === 0) return entries.slice(0, topN);

  const indexed = entries.map(indexEntry);
  const idf = buildIdf(indexed);

  // 手がかりごとにクエリとの近さを測り、指している資料の最大値を控えておく。
  const hintScoreByEntry = new Map<string, number>();
  for (const hint of hints) {
    const grams = bigrams(hint.text);
    let matched = 0;
    let possible = 0;
    for (const g of queryGrams) {
      const weight = idf.get(g);
      if (weight === undefined) continue;
      possible += weight;
      if (grams.has(g)) matched += weight;
    }
    if (possible === 0) continue;
    const score = matched / possible;
    if (score < HINT_MIN_SCORE) continue;
    const prev = hintScoreByEntry.get(hint.entryId) ?? 0;
    if (score > prev) hintScoreByEntry.set(hint.entryId, score);
  }

  const scored = indexed.map((doc) => ({
    entry: doc.entry,
    score: Math.max(
      scoreEntry(queryGrams, doc, idf),
      (hintScoreByEntry.get(doc.entry.id) ?? 0) * HINT_WEIGHT,
    ),
  }));

  scored.sort((a, b) => b.score - a.score);

  // スコア0（まったく無関係）のものは候補から外す。ただし全件0の場合は
  // 「最近登録された順」として上位N件をそのまま返す(AIに任せる)。
  const withHits = scored.filter((s) => s.score > 0);
  const pool = withHits.length > 0 ? withHits : scored;
  return pool.slice(0, topN).map((s) => s.entry);
}
