import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const TEST_LOGIN_ID = "e2e-test-member@shincha.local";
const TEST_PASSWORD = "password12345";

const prisma = new PrismaClient();

async function cleanupTestUser() {
  const u = await prisma.user.findUnique({ where: { loginId: TEST_LOGIN_ID } });
  if (!u) return;
  const convos = await prisma.conversation.findMany({ where: { userId: u.id } });
  const convoIds = convos.map((c) => c.id);
  await prisma.chatFeedback.deleteMany({ where: { conversationId: { in: convoIds } } });
  await prisma.attachment.deleteMany({ where: { chatMessage: { conversationId: { in: convoIds } } } });
  await prisma.chatMessage.deleteMany({ where: { conversationId: { in: convoIds } } });
  await prisma.conversation.deleteMany({ where: { userId: u.id } });
  await prisma.user.delete({ where: { id: u.id } });
}

function log(...args) {
  console.log(...args);
}

async function login(page, loginId, password) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="loginId"]', loginId);
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForLoadState("networkidle"), page.click('button[type="submit"]')]);
}

async function main() {
  await cleanupTestUser();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") log("[console error]", msg.text());
  });
  page.on("pageerror", (err) => log("[pageerror]", err.message));

  const results = {};

  // --- 0. sign up a fresh test member, join 開発チーム (same team as demo admin) ---
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", "E2Eテスト新人");
  await page.fill("#loginId", TEST_LOGIN_ID);
  await page.fill("#password", TEST_PASSWORD);
  await Promise.all([page.waitForURL(/\/onboarding\/team/), page.click('button:has-text("登録して次へ")')]);
  await page.click('button:has-text("開発チーム")');
  await Promise.all([page.waitForURL(`${BASE}/`), page.click('button:has-text("決定")')]);

  // --- 1. member: role restriction ---
  await page.goto(`${BASE}/tasks`);
  await page.waitForSelector("h1");
  results.memberTasksNewButtonCount = await page.locator('a[href="/tasks/new"]').count();

  await page.goto(`${BASE}/tasks/new`);
  await page.waitForLoadState("networkidle");
  results.memberDirectNewUrl = page.url();
  results.memberDirectNewBanner = await page.locator(".banner-error").count();

  // create a conversation to use for the feedback test
  const resp = await page.goto(`${BASE}/chat/new`);
  log("chat/new status:", resp?.status(), "url:", page.url());
  await page.screenshot({ path: ".tmp-debug-chatnew.png" });
  await page.waitForSelector('textarea[name="text"]');
  await page.fill('textarea[name="text"]', "E2Eテスト: 経費精算について教えてください");
  await Promise.all([
    page.waitForURL(/\/chat\/[a-z0-9]+$/i, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  results.memberConversationUrl = page.url();
  const conversationId = results.memberConversationUrl.split("/chat/")[1];

  await page.context().clearCookies();

  // --- 2. admin: role restriction (button visible) ---
  await login(page, "demo@shincha.local", "password123");
  await page.goto(`${BASE}/tasks`);
  await page.waitForSelector("h1");
  results.adminHasNewButton = await page.locator('a[href="/tasks/new"]').count();

  // --- 3. admin: team chat section ---
  await page.goto(`${BASE}/chat`);
  await page.waitForSelector("text=チームメンバーのチャット");
  results.teamMemberLinkCount = await page.locator('a[href^="/chat/team/"]').count();

  const memberLink = page.locator('a[href^="/chat/team/"]', { hasText: "E2Eテスト新人" });
  const memberLinkHref = await memberLink.getAttribute("href");
  results.teamMemberLinkHref = memberLinkHref;

  await memberLink.click();
  await page.waitForSelector("h1");
  results.memberListPageTitle = await page.locator("h1").first().innerText();

  // open the conversation we just created
  const convResp = await page.goto(`${BASE}${memberLinkHref}/${conversationId}`);
  log("admin conv status:", convResp?.status(), "url:", page.url());
  await page.screenshot({ path: ".tmp-debug-adminconv.png", fullPage: true });
  await page.waitForSelector('textarea[name="text"]', { timeout: 10000 });
  results.adminConversationTitle = await page.locator("h1").first().innerText();
  results.hasSendButtonOnAdminView = await page.locator('button:has-text("送信")').count(); // should be 0

  await page.fill('textarea[name="text"]', "E2Eテストコメント: よくできています！");
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.click('button:has-text("コメントを送る")'),
  ]);
  results.feedbackNoteCount = await page.locator("text=デモ先輩からのコメント").count();

  await page.context().clearCookies();

  // --- 4. member sees the feedback in their own view ---
  await login(page, TEST_LOGIN_ID, TEST_PASSWORD);
  await page.goto(`${BASE}/chat/${conversationId}`);
  await page.waitForSelector("body");
  results.memberSeesFeedback = await page.locator("text=E2Eテストコメント").count();

  log(JSON.stringify(results, null, 2));
  await browser.close();
}

main()
  .catch((e) => {
    console.error("FATAL", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupTestUser();
    await prisma.$disconnect();
  });
