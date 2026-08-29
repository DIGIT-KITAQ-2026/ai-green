import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "shincha_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30日

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET が設定されていません。.env に SESSION_SECRET を設定してください。",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** ユーザーIDと有効期限を署名付きCookie用トークンに変換する。 */
export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/** トークンを検証し、有効であればユーザーIDを返す。無効・期限切れなら null。 */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { uid: string; exp: number };
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** サーバーコンポーネント / Route Handler から、現在ログイン中のユーザーを取得する。 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = verifySessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { team: true },
  });
  return user;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
