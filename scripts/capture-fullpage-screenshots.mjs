import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3000';
const projectRoot = process.cwd();
const screenshotDir = path.join(projectRoot, 'screenshot');

const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;

const routes = [
  { name: '01-login',                        path: '/' },
  { name: '02-teacher-home',                 path: '/teacher' },
  { name: '03-teacher-dashboard',            path: '/teacher/dashboard' },
  { name: '04-teacher-quiz-create-step1',    path: '/teacher/quiz/create' },
  { name: '05-teacher-quiz-create-step2',    path: '/teacher/quiz/create?step=2' },
  { name: '06-teacher-quizzes',              path: '/teacher/quizzes' },
  { name: '07-teacher-assignments',          path: '/teacher/assignments' },
  { name: '08-teacher-classes',              path: '/teacher/classes' },
  { name: '09-teacher-class-detail-class-A', path: '/teacher/classes/class-A' },
  { name: '10-teacher-class-detail-class-B', path: '/teacher/classes/class-B' },
  { name: '11-teacher-class-detail-class-C', path: '/teacher/classes/class-C' },
  { name: '12-teacher-knowledge-map',        path: '/teacher/knowledge-map' },
  { name: '13-teacher-report-legacy',        path: '/teacher/report' },
  { name: '14-student-home',                 path: '/student' },
  { name: '15-student-quiz-quiz-001',        path: '/student/quiz/quiz-001' },
  { name: '16-student-quiz-quiz-002',        path: '/student/quiz/quiz-002' },
  { name: '17-student-report',               path: '/student/report' },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 解除高度鎖定：把 h-screen 外框 + main overflow-auto 展開成自然高度，
 * 讓 Puppeteer fullPage 可以截到所有內容。
 * 同時展開 overflow-x-auto 的水平捲動區，並停用動畫。
 */
async function unlockPageHeight(page) {
  await page.addStyleTag({
    content: `
      /* ── 停用動畫 / 過渡 ────────────────────────────────── */
      *, *::before, *::after {
        animation-duration:   0s !important;
        animation-delay:      0s !important;
        transition-duration:  0s !important;
        scroll-behavior:      auto !important;
      }

      /* ── 解除 h-screen 高度鎖 ──────────────────────────── */
      html, body {
        height: auto !important;
        overflow: visible !important;
      }
      .h-screen {
        height: auto !important;
        min-height: 100vh;
      }

      /* ── 讓 sidebar 不再固定高度 ────────────────────────── */
      aside {
        height: auto !important;
        overflow: visible !important;
        position: sticky !important;
        top: 0;
        align-self: flex-start;
      }

      /* ── 讓 main 自然展開，不要內部捲動 ─────────────────── */
      main {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }

      /* ── 展開水平捲動表格，不截斷右側 ─────────────────── */
      .overflow-x-auto {
        overflow-x: visible !important;
      }

      /* ── nav / sidebar 內部的捲動可保留 ─────────────────── */
      aside nav {
        overflow: visible !important;
        height: auto !important;
      }
    `,
  }).catch(() => {});
}

/**
 * 等待頁面穩定：body 出現、字型載入完、rAF 兩幀。
 */
async function waitForPageReady(page) {
  await page.waitForSelector('body', { timeout: 15000 });
  await page
    .waitForFunction(() => document.fonts?.status !== 'loading', { timeout: 10000 })
    .catch(() => {});
  // 等待圖表 / recharts SVG 產生
  await page
    .waitForFunction(() => document.querySelector('svg') !== null || true, { timeout: 5000 })
    .catch(() => {});
  await page.evaluate(
    () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))),
  );
  await delay(600);
}

/**
 * 捲動整頁（以 document 捲動為主）觸發懶加載，然後回頂。
 */
async function scrollFullPage(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const root = document.scrollingElement || document.documentElement;
    const totalH = Math.max(root.scrollHeight, document.body.scrollHeight);
    const step = Math.floor(window.innerHeight * 0.75);

    for (let y = 0; y < totalH; y += step) {
      window.scrollTo(0, y);
      await sleep(100);
    }
    window.scrollTo(0, totalH);
    await sleep(200);
    window.scrollTo(0, 0);
    await sleep(200);
  });
}

async function captureRoute(page, route) {
  const url = new URL(route.path, BASE_URL).toString();
  console.log(`→ ${route.name}  ${url}`);

  await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1 });
  await page.emulateMediaType('screen');

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPageReady(page);

  // 先解鎖高度，再等一幀讓 React re-render
  await unlockPageHeight(page);
  await delay(400);

  // 捲動觸發懶加載
  await scrollFullPage(page);
  await delay(300);

  // 取得展開後的完整高度，調整 viewport 以確保 captureBeyondViewport 無誤
  const fullHeight = await page.evaluate(() =>
    Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
    ),
  );

  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: Math.max(VIEWPORT_HEIGHT, fullHeight),
    deviceScaleFactor: 1,
  });
  await delay(200);

  const outputPath = path.join(screenshotDir, `${route.name}.png`);
  await page.screenshot({
    path: outputPath,
    fullPage: true,
    type: 'png',
    captureBeyondViewport: true,
  });

  console.log(`   ✓ saved (height=${fullHeight}px)`);
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    for (const route of routes) {
      await captureRoute(page, route);
    }
    console.log(`\nDone — ${routes.length} screenshots saved to:\n${screenshotDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
