import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const prisma = new PrismaClient();

function log(...a) { console.log(...a); }

async function setXp(xp) {
  await prisma.user.update({ where: { loginId: "demo@shincha.local" }, data: { xp } });
}

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="loginId"]', "demo@shincha.local");
  await page.fill('input[name="password"]', "password123");
  await Promise.all([page.waitForLoadState("networkidle"), page.click('button[type="submit"]')]);
}

async function readLS(page) {
  return page.evaluate(() => window.localStorage.getItem("shincha:last-seen-level"));
}

async function main() {
  await setXp(0); // fresh baseline: level 1
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. first-ever login at level 1 (establishes baseline lastSeen, no popup expected)
  await login(page);
  await page.waitForSelector("text=レベル 1");
  log("after first login, localStorage:", await readLS(page));
  log("popup visible (should be false):", await page.locator("text=レベルが上がりました").count());

  // 2. bump xp to cross into level 2, then do a client-side nav to re-render layout with new level
  await setXp(50);
  await page.click('a[href="/todos"]');
  await page.waitForSelector("text=レベル 2");
  await page.screenshot({ path: ".tmp-levelup-1-after-xp-bump.png" });
  log("after xp bump + nav, localStorage:", await readLS(page));
  log("popup visible (should be TRUE):", await page.locator("text=レベルが上がりました").count());

  // 3. click OK
  const okBtn = page.locator('button:has-text("OK")');
  if (await okBtn.count()) {
    await okBtn.click();
  }
  await page.waitForTimeout(300);
  log("after clicking OK, popup visible (should be false):", await page.locator("text=レベルが上がりました").count());
  log("localStorage after OK:", await readLS(page));

  // 4. logout
  await page.click('button:has-text("ログアウト")');
  await page.waitForURL(/\/login/);
  log("logged out, url:", page.url());

  // 5. log back in as the SAME account (no xp change in between)
  await login(page);
  await page.waitForSelector("text=レベル 2");
  await page.screenshot({ path: ".tmp-levelup-2-after-relogin.png" });
  log("after re-login, localStorage:", await readLS(page));
  log("popup visible after re-login (bug if TRUE):", await page.locator("text=レベルが上がりました").count());

  await browser.close();
}

main()
  .catch((e) => { console.error("FATAL", e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
