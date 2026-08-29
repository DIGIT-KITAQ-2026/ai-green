/**
 * 業務内容の検索（簡易版）。
 *
 * 仕様書ではベクトル埋め込みによる類似度検索(RAG)を想定しているが、
 * MVPでは外部の埋め込みAPI・ベクトルDBを追加せず、文字bi-gramの一致度で
 * 候補を絞り込む軽量な実装とする。絞り込んだ候補はAI（Claude）に渡し、
 * 最終的な選定と回答生成はAIに任せる。
 *
 * 将来、本格的なベクトル検索に置き換える場合もこの関数のインターフェースは
 * 変えずに済むよう、呼び出し側は「クエリ文字列→候補id配列」の形だけに依存する。
 */

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

function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const gram of a) {
    if (b.has(gram)) overlap++;
  }
  return (2 * overlap) / (a.size + b.size);
}

export type SearchableEntry = {
  id: string;
  title: string;
  summary: string;
  rawText: string;
};

/** クエリ文字列と最も関連度の高いエントリを上位N件返す。 */
export function rankEntriesByQuery<T extends SearchableEntry>(
  query: string,
  entries: T[],
  topN = 5,
): T[] {
  const queryGrams = bigrams(query);
  if (queryGrams.size === 0) return entries.slice(0, topN);

  const scored = entries.map((entry) => {
    const text = `${entry.title}\n${entry.summary}\n${entry.rawText}`;
    const score = diceCoefficient(queryGrams, bigrams(text));
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // スコア0（まったく無関係）のものは候補から外す。ただし全件0の場合は
  // 「最近登録された順」として上位N件をそのまま返す(AIに任せる)。
  const withHits = scored.filter((s) => s.score > 0);
  const pool = withHits.length > 0 ? withHits : scored;
  return pool.slice(0, topN).map((s) => s.entry);
}
