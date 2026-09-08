import { chromium } from "playwright-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";

function log(...a) { console.log(...a); }

async function login(page, loginId, password) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="loginId"]', loginId);
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForLoadState("networkidle"), page.click('button[type="submit"]')]);
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => log("[pageerror]", err.message));

  await login(page, "demo@shincha.local", "password123");

  // send a chat question likely to reference the existing task entry
  await page.goto(`${BASE}/chat/new`);
  await page.waitForSelector('textarea[name="text"]');
  await page.fill('textarea[name="text"]', "経費精算はどうやって申請すればいいですか？");
  await Promise.all([
    page.waitForURL(/\/chat\/[a-z0-9]+$/i, { timeout: 60000 }),
    page.click('button[type="submit"]'),
  ]);
  log("conversation url:", page.url());

  // check /tasks badge
  await page.goto(`${BASE}/tasks`);
  await page.waitForSelector("h1");
  await page.screenshot({ path: ".tmp-verify-tasks.png", fullPage: true });
  log("badge visible on /tasks:", await page.locator("text=参照").count());

  // check /chat trend chart
  await page.goto(`${BASE}/chat`);
  await page.waitForSelector("text=自分の質問傾向");
  await page.screenshot({ path: ".tmp-verify-chat.png", fullPage: true });
  log("own trend chart present:", await page.locator("text=質問した業務内容の割合").count());
  log("member trend section present (admin):", await page.locator("text=メンバーの質問傾向").count());

  await browser.close();
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
