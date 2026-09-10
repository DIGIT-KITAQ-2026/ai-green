import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

/**
 * デモ用のデータを投入する。
 *
 * スキーマそのものは supabase/migrations/ が作る。ここで入れるのは中身だけ:
 *   ・部門（所属選択に出るもの）
 *   ・デモ用アカウント（先輩・管理者）
 *   ・業務内容32件とそのPDF
 *   ・みんなのメモ8件
 *
 * 何度実行しても増えないよう、すでにあるものは飛ばす。
 * 認証ユーザーの作成やRLSを越えた書き込みが要るので、service role で繋ぐ。
 */

const SEED_DATA_DIR = path.join(__dirname, "seed-data");
const DEMO_LOGIN_ID = "demo@shincha.local";
const DEMO_PASSWORD = "password123";

/**
 * デモ先輩の初期経験値。Lv8（ぎょくろ様まで解放）に届く値にしてある。
 * デモでコレクションが全部埋まった状態を見せるための値で、
 * 加点ルールとは関係がない。
 */
const DEMO_XP = 970;

// 所属選択画面に出す部門。
// 対象を「コーポレート職（総務・人事など）」に絞ったため、その部門構成にしている。
const TEAMS = ["人事", "総務", "経理", "法務"];

type SeedEntry = {
  title: string;
  teamName: string;
  summary: string;
  rawText: string;
  attachments: { filename: string; mimeType: string; kind: string }[];
};

type SeedSharedNote = {
  /** このメモを持つ部門。参照する資料の部門とは必ずしも一致しない。 */
  teamName: string;
  /** どの業務内容についてのメモか（タイトルで対応づける） */
  entryTitle: string;
  title: string;
  body: string;
  /** 実際に使いそうな言い回し。チャットの検索で手がかりに使う。 */
  sourceQuestions: string[];
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が設定されていません。.env.local を確認してください。`);
  }
  return value;
}

const supabase = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function seedTeams() {
  for (const name of TEAMS) {
    const { data } = await supabase.from("teams").select("id").eq("name", name).maybeSingle();
    if (!data) await supabase.from("teams").insert({ name });
  }
  console.log(`Teams ready: ${TEAMS.join(" / ")}`);
}

/** 動作確認用のデモ管理者アカウント（先輩ロール）。 */
async function seedDemoUser(): Promise<string | null> {
  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingList?.users.find((u) => u.email === DEMO_LOGIN_ID);

  let userId = existing?.id ?? null;
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_LOGIN_ID,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "デモ先輩" },
    });
    if (error || !data.user) {
      console.error("Failed to create demo account:", error?.message);
      return null;
    }
    userId = data.user.id;
    console.log(`Seeded demo account: ${DEMO_LOGIN_ID} / ${DEMO_PASSWORD}`);
  }

  const { data: team } = await supabase.from("teams").select("id").eq("name", "人事").single();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: "デモ先輩",
      role: "admin",
      team_id: team?.id ?? null,
      xp: DEMO_XP,
    })
    .eq("id", userId);
  if (profileError) {
    console.error("Failed to set up demo profile:", profileError.message);
    return null;
  }

  return userId;
}

/**
 * デモ用の業務内容。実際に登録画面からPDFをアップロードしてAIに読み取らせた
 * 結果を書き出したもの（supabase/seed-data/task-entries.json）。
 * ここから流し込むので、AI（claude login）が無くても同じデモ環境を再現できる。
 */
async function seedTaskEntries(authorId: string) {
  const jsonPath = path.join(SEED_DATA_DIR, "task-entries.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No seed-data/task-entries.json — skipped demo entries.");
    return;
  }

  const entries: SeedEntry[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const { data: teams } = await supabase.from("teams").select("id, name");
  const teamIdByName = new Map((teams ?? []).map((t) => [t.name, t.id]));
  let created = 0;

  for (const entry of entries) {
    const { data: existing } = await supabase
      .from("task_entries")
      .select("id")
      .eq("title", entry.title)
      .maybeSingle();
    if (existing) continue;

    const teamId = teamIdByName.get(entry.teamName);
    if (!teamId) {
      console.warn(`Team not found: ${entry.teamName} — skipped "${entry.title}"`);
      continue;
    }

    const { data: created_, error } = await supabase
      .from("task_entries")
      .insert({
        title: entry.title,
        team_id: teamId,
        summary: entry.summary,
        raw_text: entry.rawText,
        created_by: authorId,
      })
      .select("id")
      .single();
    if (error || !created_) {
      console.warn(`Failed to insert "${entry.title}":`, error?.message);
      continue;
    }

    // 添付PDFが見つからない場合でも、本文だけは登録して一覧が成立するようにする。
    for (const a of entry.attachments) {
      const filePath = path.join(SEED_DATA_DIR, "files", a.filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`Attachment not found: ${a.filename}`);
        continue;
      }
      const storagePath = `task-entries/${created_.id}/${a.filename}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, fs.readFileSync(filePath), {
          contentType: a.mimeType,
          upsert: true,
        });
      if (uploadError) {
        console.warn(`Failed to upload ${a.filename}:`, uploadError.message);
        continue;
      }
      await supabase.from("attachments").insert({
        kind: a.kind as "image" | "pdf",
        filename: a.filename,
        mime_type: a.mimeType,
        storage_path: storagePath,
        task_entry_id: created_.id,
      });
    }

    created++;
  }

  // 業務内容の登録には経験値を付けない（アプリ側の加点対象から外したため）。
  console.log(
    created > 0
      ? `Seeded ${created} demo task entries.`
      : "Demo task entries already present — nothing to add.",
  );
}

/**
 * デモ用の「みんなのメモ」を投入する。
 *
 * みんなのメモは所属チームの中だけで共有されるので、1つの部門にしか入れないと
 * 他の部門のアカウントでは画面が空になる。どの部門でログインしてもデモできるよう、
 * teamName で部門ごとに配っている。
 *
 * 参照する資料は自部門のものとは限らない（総務の人が経理の資料を見ることもある）。
 * そのほうが実態に近く、一覧の色分けと絞り込みも意味を持つ。
 *
 * チャットの検索は、共有メモに残った「その言い方をした人はこの資料に辿り着いた」
 * という対応を手がかりに使う。ただし文字の重なりで判定しているため、
 * 1資料につき1通りの言い回ししか無いと効果が出ない。
 * デモで機能が伝わるよう、1資料あたり3〜4通りの言い回しを入れている。
 */
async function seedSharedNotes(authorId: string) {
  const jsonPath = path.join(SEED_DATA_DIR, "shared-notes.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No seed-data/shared-notes.json — skipped shared notes.");
    return;
  }

  const { data: teams } = await supabase.from("teams").select("id, name");
  const teamIdByName = new Map((teams ?? []).map((t) => [t.name, t.id]));

  const notes: SeedSharedNote[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  let created = 0;

  for (const note of notes) {
    const teamId = teamIdByName.get(note.teamName);
    if (!teamId) {
      console.warn(`Team not found: ${note.teamName} — skipped "${note.title}"`);
      continue;
    }

    const { data: existing } = await supabase
      .from("shared_notes")
      .select("id")
      .eq("title", note.title)
      .eq("team_id", teamId)
      .maybeSingle();
    if (existing) continue;

    const { data: entry } = await supabase
      .from("task_entries")
      .select("id")
      .eq("title", note.entryTitle)
      .maybeSingle();

    await supabase.from("shared_notes").insert({
      title: note.title,
      body: note.body,
      team_id: teamId,
      author_id: authorId,
      referenced_task_entry_id: entry?.id ?? null,
      source_questions: note.sourceQuestions.join("\n"),
    });
    created++;
  }

  // 共有そのものには経験値を付けない（判断に点数が混ざらないようにするため）。
  console.log(
    created > 0
      ? `Seeded ${created} demo shared notes.`
      : "Demo shared notes already present — nothing to add.",
  );
}

async function main() {
  await seedTeams();
  const authorId = await seedDemoUser();
  if (!authorId) return;
  await seedTaskEntries(authorId);
  await seedSharedNotes(authorId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
