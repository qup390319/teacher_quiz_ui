/**
 * 補拍：
 *  - 真正的登入頁（fresh context，沒 cookie）
 *  - 登入後彈窗（點教師卡 → 顯示帳號/密碼欄位）
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const outDir = path.join(process.cwd(), 'screenshot', 'cheatsheet');
const VW = 1440, VH = 900;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function killAnimations(page) {
  await page.addStyleTag({ content: `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;}` });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: VW, height: VH });

    // 1) Fresh login page
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await killAnimations(page);
    await sleep(1200);
    await page.screenshot({ path: path.join(outDir, '01-login.png'), type: 'png' });
    console.log('  ✓ 01-login.png');

    // 2) Login modal opened (click teacher card)
    await page.click('button:has(h2)'); // teacher card has h2 "我是老師"
    await sleep(700);
    await killAnimations(page);
    await page.screenshot({ path: path.join(outDir, '01b-login-modal.png'), type: 'png' });
    console.log('  ✓ 01b-login-modal.png');

    await ctx.close();
    console.log('Done.');
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
