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

/**
 * ユーザーIDと有効期限を署名付きCookie用トークンに変換する。
 *
 * sv（セッション世代）を一緒に入れておき、getCurrentUser でDB側の値と
 * 突き合わせる。ユーザー側の値を増やせば、発行済みのトークンをまとめて
 * 無効にできる（他の端末からのログアウト・パスワード変更時に使う）。
 */
export function createSessionToken(userId: string, sessionVersion: number): string {
  const payload = JSON.stringify({
    uid: userId,
    sv: sessionVersion,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * トークンを検証し、有効であれば中身を返す。無効・期限切れなら null。
 * 署名の検証まで。セッション世代の照合はDBが要るので getCurrentUser で行う。
 */
export function verifySessionToken(
  token: string | undefined,
): { userId: string; sessionVersion: number } | null {
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
    ) as { uid: string; sv?: number; exp: number };
    if (payload.exp < Date.now()) return null;
    return { userId: payload.uid, sessionVersion: payload.sv ?? 0 };
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
  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { team: true },
  });
  if (!user) return null;

  // 他の端末からのログアウト・パスワード変更で世代が進んだトークンは無効。
  if (user.sessionVersion !== session.sessionVersion) return null;
  // 管理者に止められたアカウントは入れない。
  if (!user.isActive) return null;

  return user;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
