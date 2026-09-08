"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginId || !password) {
    redirect(`/login?error=${encodeURIComponent("IDとパスワードを入力してください")}`);
  }

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=${encodeURIComponent("IDまたはパスワードが正しくありません")}`);
  }
  // 管理者に停止されたアカウント。理由は明かさず、同じ文面にはしない。
  if (!user!.isActive) {
    redirect(
      `/login?error=${encodeURIComponent("このアカウントは利用が停止されています。管理者にお問い合わせください。")}`,
    );
  }

  (await cookies()).set(
    SESSION_COOKIE,
    createSessionToken(user!.id, user!.sessionVersion),
    SESSION_COOKIE_OPTIONS,
  );

  redirect(user!.teamId ? "/" : "/onboarding/team");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !loginId || !password) {
    redirect(`/signup?error=${encodeURIComponent("すべての項目を入力してください")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("パスワードは8文字以上にしてください")}`);
  }

  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("そのIDはすでに使われています")}`);
  }

  const user = await prisma.user.create({
    data: {
      name,
      loginId,
      passwordHash: await hashPassword(password),
    },
  });

  (await cookies()).set(
    SESSION_COOKIE,
    createSessionToken(user.id, user.sessionVersion),
    SESSION_COOKIE_OPTIONS,
  );

  redirect("/onboarding/team");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
