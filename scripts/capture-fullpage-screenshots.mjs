import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3000';
const projectRoot = process.cwd();
const screenshotDir = path.join(projectRoot, 'screenshot');

const routes = [
  { name: '01-login', path: '/' },
  { name: '02-teacher-home', path: '/teacher' },
  { name: '03-teacher-dashboard', path: '/teacher/dashboard' },
  { name: '04-teacher-quiz-create-step1', path: '/teacher/quiz/create' },
  { name: '05-teacher-quiz-create-step2', path: '/teacher/quiz/create?step=2' },
  { name: '06-teacher-quizzes', path: '/teacher/quizzes' },
  { name: '07-teacher-assignments', path: '/teacher/assignments' },
  { name: '08-teacher-classes', path: '/teacher/classes' },
  { name: '09-teacher-class-detail-class-A', path: '/teacher/classes/class-A' },
  { name: '10-teacher-class-detail-class-B', path: '/teacher/classes/class-B' },
  { name: '11-teacher-class-detail-class-C', path: '/teacher/classes/class-C' },
  { name: '12-teacher-knowledge-map', path: '/teacher/knowledge-map' },
  { name: '13-teacher-report-legacy', path: '/teacher/report' },
  { name: '14-student-home', path: '/student' },
  { name: '15-student-quiz-quiz-001', path: '/student/quiz/quiz-001' },
  { name: '16-student-quiz-quiz-002', path: '/student/quiz/quiz-002' },
  { name: '17-student-report', path: '/student/report' },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureScreenshotDir() {
  await fs.mkdir(screenshotDir, { recursive: true });
}

async function stabilizePage(page) {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaType('screen');
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  }).catch(() => {});
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const root = document.scrollingElement || document.documentElement;
    const maxScrollTop = root.scrollHeight - window.innerHeight;
    const step = Math.max(Math.floor(window.innerHeight * 0.8), 240);

    for (let current = 0; current < maxScrollTop; current += step) {
      window.scrollTo(0, current);
      await delay(120);
    }

    window.scrollTo(0, root.scrollHeight);
    await delay(250);
    window.scrollTo(0, 0);
    await delay(250);
  });
}

async function waitForPageReady(page) {
  await page.waitForSelector('body', { timeout: 15000 });
  await page.waitForFunction(() => document.fonts?.status !== 'loading', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await delay(500);
}

async function captureRoute(page, route) {
  const url = new URL(route.path, baseUrl).toString();
  console.log(`Capturing ${route.name}: ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPageReady(page);
  await stabilizePage(page);
  await autoScroll(page);

  const outputPath = path.join(screenshotDir, `${route.name}.png`);
  await page.screenshot({
    path: outputPath,
    fullPage: true,
    type: 'png',
    captureBeyondViewport: true,
  });
}

async function main() {
  await ensureScreenshotDir();

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
    console.log(`Saved ${routes.length} screenshots to ${screenshotDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
