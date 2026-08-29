import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
