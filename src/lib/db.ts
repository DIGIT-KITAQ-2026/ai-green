import { PrismaClient } from "@prisma/client";

// Next.js の開発サーバーはホットリロードのたびにモジュールを再評価するため、
// グローバルにキャッシュしてPrismaClientの多重生成を防ぐ。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
