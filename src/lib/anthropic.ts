import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

/** Anthropicクライアントを遅延生成する（ANTHROPIC_API_KEY未設定時に import 時点で落ちないように）。 */
export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

export type UploadedFile = {
  kind: "image" | "pdf";
  mimeType: "image/jpeg" | "image/png" | "application/pdf";
  data: Buffer;
  filename: string;
};

function fileToContentBlock(file: UploadedFile): Anthropic.ContentBlockParam {
  const base64 = file.data.toString("base64");
  if (file.kind === "image") {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: file.mimeType as "image/jpeg" | "image/png",
        data: base64,
      },
    };
  }
  return {
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: base64 },
  };
}

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/** モデルの応答からJSONオブジェクトを取り出す。失敗時はnullを返す。 */
function tryParseJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : text);
  } catch {
    return null;
  }
}

/**
 * 登録画面: アップロードされた画像・PDFから業務内容を読み取り、
 * 一覧表示用の要約と、チャット検索の対象になる全文テキストを生成する。
 */
export async function analyzeRegistration(params: {
  title: string;
  teamName: string;
  type: "task" | "manual";
  files: UploadedFile[];
}): Promise<{ summary: string; rawText: string }> {
  if (params.files.length === 0) {
    return { summary: "(添付ファイルなし)", rawText: "" };
  }

  const client = getAnthropicClient();
  const label = params.type === "manual" ? "マニュアル" : "業務内容";

  const content: Anthropic.ContentBlockParam[] = params.files.map(fileToContentBlock);
  content.push({
    type: "text",
    text: [
      `これは「${params.teamName}」チームの${label}「${params.title}」として登録される資料です。`,
      "添付された画像・PDFの内容を読み取り、次のJSON形式のみで回答してください。",
      "説明文やMarkdownのコードブロックは付けず、JSONオブジェクト1つだけを出力してください。",
      "{",
      '  "rawText": "資料に書かれている内容をできるだけ漏れなく書き起こしたテキスト",',
      '  "summary": "新人が一覧でひと目で内容を把握できる3〜5文程度の要約"',
      "}",
    ].join("\n"),
  });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    output_config: { effort: "medium" },
    messages: [{ role: "user", content }],
  });

  const text = extractText(response);
  const parsed = tryParseJson(text);
  if (!parsed) {
    return { summary: text.slice(0, 200) || "(要約を生成できませんでした)", rawText: text };
  }
  return {
    summary: String(parsed.summary ?? "").trim() || "(要約を生成できませんでした)",
    rawText: String(parsed.rawText ?? "").trim() || text,
  };
}

export type CandidateEntry = {
  id: string;
  title: string;
  summary: string;
  teamName: string;
};

/**
 * チャット画面: 新人の質問（＋任意の添付）と、検索でヒットした業務内容の
 * 候補一覧をもとに、AIが回答と参照元の業務内容を選ぶ。
 */
export async function answerChatQuestion(params: {
  question: string;
  files: UploadedFile[];
  candidates: CandidateEntry[];
}): Promise<{ answer: string; referencedTaskEntryId: string | null }> {
  const client = getAnthropicClient();

  const candidateList = params.candidates.length
    ? params.candidates
        .map(
          (c, i) =>
            `${i + 1}. [id:${c.id}] (${c.teamName}) ${c.title} — ${c.summary}`,
        )
        .join("\n")
    : "(まだ該当しそうな業務内容は登録されていません)";

  const content: Anthropic.ContentBlockParam[] = params.files.map(fileToContentBlock);
  content.push({
    type: "text",
    text: [
      "あなたは新人研修アプリ「新-cha-」の湯呑みマスコット案内役です。親しみやすく簡潔な日本語で答えてください。",
      "以下はデータベースに蓄積されている業務内容の候補です。質問内容と最も関連する候補があれば、それを根拠に回答してください。",
      "候補に書かれていないことを答えたり、情報を作り上げたりしないでください。該当する候補がない場合は、その旨を伝えたうえで一般的なアドバイスをしてください。",
      "",
      "【業務内容の候補】",
      candidateList,
      "",
      `【新人からの質問】\n${params.question || "(添付ファイルのみ)"}`,
      "",
      "回答は次のJSON形式のみで出力してください。説明文やコードブロックは付けないでください。",
      "{",
      '  "answer": "新人への回答本文",',
      '  "referencedId": "回答の根拠にした候補のid文字列。該当なしの場合はnull"',
      "}",
    ].join("\n"),
  });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2048,
    output_config: { effort: "low" },
    messages: [{ role: "user", content }],
  });

  const text = extractText(response);
  const parsed = tryParseJson(text);
  if (!parsed) {
    return { answer: text || "うまく回答を生成できませんでした。もう一度お試しください。", referencedTaskEntryId: null };
  }
  const referencedId = parsed.referencedId;
  return {
    answer: String(parsed.answer ?? text).trim(),
    referencedTaskEntryId:
      typeof referencedId === "string" && referencedId !== "null" ? referencedId : null,
  };
}
