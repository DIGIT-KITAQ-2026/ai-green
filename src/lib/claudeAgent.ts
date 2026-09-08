import os from "os";
import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ContentBlockParam, MessageParam } from "@anthropic-ai/sdk/resources";

/**
 * Claude呼び出しはすべて Claude Agent SDK（Claude Codeをライブラリ化したもの）経由で行う。
 * ANTHROPIC_API_KEY による従量課金APIは使用しない — ローカルの `claude login` セッション
 * （Claude Codeのサブスクリプション認証）をそのまま利用する。
 *
 * ツール（ファイル操作・Bash等）はすべて無効化し、CLAUDE.md等のプロジェクト設定も読み込まない
 * （settingSources: []）。単発の質問応答・資料読み取りにのみ使う、隔離されたワンショット呼び出し。
 */

export type UploadedFile = {
  kind: "image" | "pdf";
  mimeType: "image/jpeg" | "image/png" | "application/pdf";
  data: Buffer;
  filename: string;
};

function fileToContentBlock(file: UploadedFile): ContentBlockParam {
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

async function* singleTurn(content: ContentBlockParam[]): AsyncGenerator<SDKUserMessage> {
  const message: MessageParam = { role: "user", content };
  yield { type: "user", message, parent_tool_use_id: null };
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
 * Claude Code(Claude Agent SDK)へ単発の問い合わせを送り、最終テキストを受け取る。
 * ツールなし・1ターンのみの隔離セッションとして起動し、完了後は必ずプロセスを閉じる。
 */
async function runAgentQuery(params: {
  systemPrompt: string;
  content: ContentBlockParam[];
}): Promise<string> {
  const events = query({
    prompt: singleTurn(params.content),
    options: {
      systemPrompt: params.systemPrompt,
      tools: [],
      maxTurns: 1,
      settingSources: [],
      cwd: os.tmpdir(),
    },
  });

  try {
    for await (const message of events) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          return message.result;
        }
        throw new Error(
          `Claude Codeでの応答生成に失敗しました（${message.subtype}）: ${message.errors.join(", ") || "詳細不明"}`,
        );
      }
    }
    throw new Error("Claude Codeから応答が得られませんでした。");
  } finally {
    events.close();
  }
}

/**
 * 登録画面: アップロードされた画像・PDFから業務内容を読み取り、
 * 一覧表示用の要約と、チャット検索の対象になる全文テキストを生成する。
 */
export async function analyzeRegistration(params: {
  title: string;
  teamName: string;
  files: UploadedFile[];
}): Promise<{ summary: string; rawText: string }> {
  if (params.files.length === 0) {
    return { summary: "(添付ファイルなし)", rawText: "" };
  }

  const content: ContentBlockParam[] = params.files.map(fileToContentBlock);
  content.push({
    type: "text",
    text: [
      `これは「${params.teamName}」チームの業務内容「${params.title}」として登録される資料です。`,
      "添付された画像・PDFの内容を読み取り、次のJSON形式のみで回答してください。",
      "説明文やMarkdownのコードブロックは付けず、JSONオブジェクト1つだけを出力してください。",
      "{",
      '  "rawText": "資料に書かれている内容をできるだけ漏れなく書き起こしたテキスト",',
      '  "summary": "新人が一覧でひと目で内容を把握できる3〜5文程度の要約"',
      "}",
    ].join("\n"),
  });

  const text = await runAgentQuery({
    systemPrompt:
      "あなたは、総務・人事・経理・法務といったコーポレート部門の新人を支援するアプリ「新-cha-」で、業務内容の登録を手伝うアシスタントです。社内規程や手続きの資料を扱うため、期限・金額・承認者などの条件は省略せずに書き起こしてください。指示されたJSON形式だけを出力してください。",
    content,
  });

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

/** キャラクター未選択のときの話し方。 */
const DEFAULT_VOICE =
  "一人称は「ぼく」。「〜だよ」「〜してね」のやわらかい常体で、明るく親しみやすく話す。";

export type HistoryTurn = {
  role: "user" | "assistant";
  text: string;
};

/**
 * チャット画面: 新人の質問（＋任意の添付）と、検索でヒットした業務内容の
 * 候補一覧をもとに、AIが回答と参照元の業務内容を選ぶ。
 *
 * 過去の会話を開き直して続きを聞けるよう、同じ会話の直近のやり取りも渡す。
 * これがないと「さっきの件だけど」のような聞き方が通じない。
 */
export async function answerChatQuestion(params: {
  question: string;
  files: UploadedFile[];
  candidates: CandidateEntry[];
  history?: HistoryTurn[];
  /** 選択中のキャラクターの話し方（src/lib/rewards.ts の voice）。 */
  voice?: string;
}): Promise<{ answer: string; referencedTaskEntryId: string | null }> {
  const candidateList = params.candidates.length
    ? params.candidates
        .map(
          (c, i) =>
            `${i + 1}. [id:${c.id}] (${c.teamName}) ${c.title} — ${c.summary}`,
        )
        .join("\n")
    : "(まだ該当しそうな業務内容は登録されていません)";

  const historyBlock = params.history?.length
    ? [
        "【これまでの会話】",
        params.history
          .map((h) => `${h.role === "user" ? "新人" : "あなた"}: ${h.text}`)
          .join("\n"),
        "",
      ]
    : [];

  const content: ContentBlockParam[] = params.files.map(fileToContentBlock);
  content.push({
    type: "text",
    text: [
      "以下はデータベースに蓄積されている業務内容の候補です。質問内容と最も関連する候補があれば、それを根拠に回答してください。",
      "候補に書かれていないことを答えたり、情報を作り上げたりしないでください。該当する候補がない場合は、その旨を伝えたうえで一般的なアドバイスをしてください。",
      "",
      "【業務内容の候補】",
      candidateList,
      "",
      ...historyBlock,
      "会話の続きであれば、これまでのやり取りを踏まえて答えてください。ただし根拠はあくまで上の候補に限ります。",
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

  // 役割と守るべきことは全キャラクター共通。voice で変えるのは話し方だけ。
  // ここを共通にしておかないと、選んだキャラクターによって説明の質が変わってしまう。
  const systemPrompt = [
    "あなたは、総務・人事・経理・法務といったコーポレート部門の新人を支援するアプリ「新-cha-」の案内役です。",
    "扱うのは社内規程や手続きのルールです。期限・金額・承認者・例外条件を落とさずに答えてください。",
    "",
    "【話し方】",
    params.voice ?? DEFAULT_VOICE,
    "",
    "【話し方を変えても、次の点はどのキャラクターでも同じにすること】",
    "・答える内容、詳しさ、正確さを変えない。口調だけを変える。",
    "・候補に書かれていないことを答えない。分からないときは分からないと言う。",
    "・数字や期限、承認者などの条件は、口調に関係なく必ず省略せずに伝える。",
    "・相手を見下したり、突き放したりしない。",
    "",
    "指示されたJSON形式だけを出力してください。",
  ].join("\n");

  const text = await runAgentQuery({ systemPrompt, content });

  const parsed = tryParseJson(text);
  if (!parsed) {
    return {
      answer: text || "うまく回答を生成できませんでした。もう一度お試しください。",
      referencedTaskEntryId: null,
    };
  }
  const referencedId = parsed.referencedId;
  return {
    answer: String(parsed.answer ?? text).trim(),
    referencedTaskEntryId:
      typeof referencedId === "string" && referencedId !== "null" ? referencedId : null,
  };
}

/**
 * みんなのメモ: チャットのやり取りを、チームで共有できる短いメモに要約する。
 *
 * 元の会話は本人しか見られないため、ここで作る文章だけがチームに渡る。
 * 「誰が聞いたか」ではなく「何が分かったか」だけを残すよう指示している。
 */
export async function summarizeConversationForSharing(params: {
  messages: { role: string; text: string }[];
}): Promise<{ title: string; body: string }> {
  const transcript = params.messages
    .map((m) => `${m.role === "user" ? "質問" : "回答"}: ${m.text}`)
    .join("\n");

  const text = await runAgentQuery({
    systemPrompt:
      "あなたは、コーポレート部門の新人を支援するアプリ「新-cha-」の案内役です。ここで作る文章はチーム全員が読む共有メモなので、キャラクターらしい話し方はせず、中立的な文章にしてください。指示されたJSON形式だけを出力してください。",
    content: [
      {
        type: "text",
        text: [
          "以下は、新人とAIのチャットのやり取りです。",
          "これをチーム全員が読む共有メモにまとめてください。",
          "",
          "【まとめ方】",
          "・「誰が聞いたか」は書かない。何が分かったかだけを書く。",
          "・やり取りに出てこない情報を足さない。",
          "・数字や期限、承認者などの具体的な条件は省略せずに残す。",
          "・後から読んだ人がそのまま使える、である調の文章にする。",
          "",
          "【やり取り】",
          transcript,
          "",
          "次のJSON形式のみで出力してください。説明文やコードブロックは付けないでください。",
          "{",
          '  "title": "一覧で見て内容が分かる20文字以内の見出し",',
          '  "body": "本文。2〜5文程度。長い場合は箇条書きにしてよい"',
          "}",
        ].join("\n"),
      },
    ],
  });

  const parsed = tryParseJson(text);
  const title = String(parsed?.title ?? "").trim();
  const body = String(parsed?.body ?? "").trim();

  return {
    title: title.slice(0, 60) || "共有メモ",
    body: body || text.trim() || "(要約を作成できませんでした)",
  };
}
