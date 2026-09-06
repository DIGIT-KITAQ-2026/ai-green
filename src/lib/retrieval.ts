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
 * 将来、本格的なベクトル検索に置き換える場合もこの関数のインターフェースは
 * 変えずに済むよう、呼び出し側は「クエリ文字列→候補配列」の形だけに依存する。
 */

/** どこに出てきた語かで重みを変える。タイトル一致が一番強い。 */
const WEIGHT_TITLE = 1;
const WEIGHT_SUMMARY = 0.6;
const WEIGHT_RAWTEXT = 0.4;

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
): T[] {
  const queryGrams = bigrams(query);
  if (queryGrams.size === 0) return entries.slice(0, topN);

  const indexed = entries.map(indexEntry);
  const idf = buildIdf(indexed);

  const scored = indexed.map((doc) => ({
    entry: doc.entry,
    score: scoreEntry(queryGrams, doc, idf),
  }));

  scored.sort((a, b) => b.score - a.score);

  // スコア0（まったく無関係）のものは候補から外す。ただし全件0の場合は
  // 「最近登録された順」として上位N件をそのまま返す(AIに任せる)。
  const withHits = scored.filter((s) => s.score > 0);
  const pool = withHits.length > 0 ? withHits : scored;
  return pool.slice(0, topN).map((s) => s.entry);
}
