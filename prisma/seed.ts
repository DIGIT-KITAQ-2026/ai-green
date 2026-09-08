import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { XP_RULES } from "../src/lib/rewards";

const prisma = new PrismaClient();

const SEED_DATA_DIR = path.join(__dirname, "seed-data");

/**
 * デモ用の業務内容。実際に登録画面からPDFをアップロードしてAIに読み取らせた
 * 結果を書き出したもの（prisma/seed-data/task-entries.json）。
 * ここから流し込むので、AI（claude login）が無くても同じデモ環境を再現できる。
 */
type SeedSharedNote = {
  /** どの業務内容についてのメモか（タイトルで対応づける） */
  entryTitle: string;
  title: string;
  body: string;
  /** 新人が実際に使いそうな言い回し。チャットの検索で手がかりに使う。 */
  sourceQuestions: string[];
};

type SeedEntry = {
  title: string;
  teamName: string;
  summary: string;
  rawText: string;
  attachments: { filename: string; mimeType: string; kind: string }[];
};

// 所属選択画面の手書きメモにあったチーム例
const TEAMS = ["営業チーム", "開発チーム", "カスタマーサポート"];

async function main() {
  for (const name of TEAMS) {
    await prisma.team.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const devTeam = await prisma.team.findUniqueOrThrow({
    where: { name: "開発チーム" },
  });

  // 動作確認用のデモ管理者アカウント（先輩ロール）
  const demoLoginId = "demo@shincha.local";
  const existing = await prisma.user.findUnique({
    where: { loginId: demoLoginId },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        loginId: demoLoginId,
        passwordHash: await bcrypt.hash("password123", 10),
        name: "デモ先輩",
        nickname: "せんぱい",
        role: "admin",
        teamId: devTeam.id,
      },
    });
    console.log(`Seeded demo account: ${demoLoginId} / password123`);
  }

  await seedTaskEntries();
  await seedSharedNotes();

  console.log("Seed complete.");
}

/**
 * デモ用の業務内容を投入する。
 * 同じタイトルが既にあれば何もしないので、何度実行しても増えない。
 */
async function seedTaskEntries() {
  const jsonPath = path.join(SEED_DATA_DIR, "task-entries.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No seed-data/task-entries.json — skipped demo entries.");
    return;
  }

  const author = await prisma.user.findUnique({
    where: { loginId: "demo@shincha.local" },
  });
  if (!author) {
    console.log("Demo account not found — skipped demo entries.");
    return;
  }

  const entries: SeedEntry[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  let created = 0;

  for (const entry of entries) {
    const existing = await prisma.taskEntry.findFirst({
      where: { title: entry.title },
    });
    if (existing) continue;

    const team = await prisma.team.findUnique({ where: { name: entry.teamName } });
    if (!team) {
      console.warn(`Team not found: ${entry.teamName} — skipped "${entry.title}"`);
      continue;
    }

    // 添付PDFが見つからない場合でも、本文だけは登録して一覧が成立するようにする。
    const attachments = entry.attachments.flatMap((a) => {
      const filePath = path.join(SEED_DATA_DIR, "files", a.filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`Attachment not found: ${a.filename}`);
        return [];
      }
      return [
        {
          kind: a.kind,
          filename: a.filename,
          mimeType: a.mimeType,
          data: fs.readFileSync(filePath),
        },
      ];
    });

    await prisma.taskEntry.create({
      data: {
        title: entry.title,
        teamId: team.id,
        summary: entry.summary,
        rawText: entry.rawText,
        createdById: author.id,
        attachments: { create: attachments },
      },
    });
    created++;
  }

  if (created > 0) {
    // アプリと同じルールで、登録した分の経験値を登録者に付ける。
    await prisma.user.update({
      where: { id: author.id },
      data: { xp: { increment: created * XP_RULES.entryCreated } },
    });
    console.log(`Seeded ${created} demo task entries (+${created * XP_RULES.entryCreated} XP).`);
  } else {
    console.log("Demo task entries already present — nothing to add.");
  }
}

/**
 * デモ用の「みんなのメモ」を投入する。
 *
 * チャットの検索は、共有メモに残った「その言い方をした人はこの資料に辿り着いた」
 * という対応を手がかりに使う。ただし文字の重なりで判定しているため、
 * 1資料につき1通りの言い回ししか無いと効果が出ない。
 * デモで機能が伝わるよう、1資料あたり3〜4通りの言い回しを入れている。
 *
 * 同じ見出しが既にあれば何もしないので、何度実行しても増えない。
 */
async function seedSharedNotes() {
  const jsonPath = path.join(SEED_DATA_DIR, "shared-notes.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No seed-data/shared-notes.json — skipped shared notes.");
    return;
  }

  const author = await prisma.user.findUnique({
    where: { loginId: "demo@shincha.local" },
  });
  if (!author?.teamId) {
    console.log("Demo account (or its team) not found — skipped shared notes.");
    return;
  }

  const notes: SeedSharedNote[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  let created = 0;

  for (const note of notes) {
    const existing = await prisma.sharedNote.findFirst({
      where: { title: note.title, teamId: author.teamId },
    });
    if (existing) continue;

    const entry = await prisma.taskEntry.findFirst({
      where: { title: note.entryTitle },
      select: { id: true },
    });

    await prisma.sharedNote.create({
      data: {
        title: note.title,
        body: note.body,
        teamId: author.teamId,
        authorId: author.id,
        referencedTaskEntryId: entry?.id ?? null,
        sourceQuestions: note.sourceQuestions.join("\n"),
      },
    });
    created++;
  }

  console.log(
    created > 0
      ? `Seeded ${created} demo shared notes.`
      : "Demo shared notes already present — nothing to add.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
