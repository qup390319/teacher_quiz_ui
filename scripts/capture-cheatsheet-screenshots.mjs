/**
 * 為「教師端懶人包簡報」截圖。
 * - 教師端 (aaa001) 與學生端 (115001) 都會自動登入
 * - 截 viewport (1440x900) 而非 full page，方便塞到投影片
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3000';
const projectRoot = process.cwd();
const screenshotDir = path.join(projectRoot, 'screenshot', 'cheatsheet');

const VW = 1440;
const VH = 900;

const TEACHER_ROUTES = [
  { name: '01-login',                path: '/' },
  { name: '02-teacher-home',         path: '/teacher' },
  { name: '03-quiz-create-step1',    path: '/teacher/quiz/create' },
  { name: '04-quiz-library',         path: '/teacher/quizzes' },
  { name: '05-assignments',          path: '/teacher/assignments' },
  { name: '06-dashboard-overview',   path: '/teacher/dashboard/overview' },
  { name: '07-dashboard-classes',    path: '/teacher/dashboard/classes' },
  { name: '08-dashboard-misconceptions', path: '/teacher/dashboard/misconceptions' },
  { name: '09-dashboard-students',   path: '/teacher/dashboard/students' },
  { name: '10-classes',              path: '/teacher/classes' },
  { name: '11-class-detail',         path: '/teacher/classes/class-A' },
];

const STUDENT_ROUTES = [
  { name: '20-student-home',         path: '/student' },
  { name: '21-student-quiz',         path: '/student/quiz/quiz-001' },
  { name: '22-student-report',       path: '/student/report' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, account, password, role) {
  const res = await page.evaluate(
    async (a, p, r) => {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: a, password: p, role: r }),
      });
      return { ok: resp.ok, status: resp.status, body: await resp.text() };
    },
    account,
    password,
    role,
  );
  if (!res.ok) {
    throw new Error(`Login failed for ${account}: ${res.status} ${res.body}`);
  }
  console.log(`  ✓ logged in as ${account} (${role})`);
}

async function disableAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

async function captureRoute(page, route) {
  const url = new URL(route.path, BASE_URL).toString();
  console.log(`  → ${route.name}  ${route.path}`);
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch(async () => {
    // networkidle0 might never settle on pages with polling; fall back
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });
  await disableAnimations(page);
  await page.waitForFunction(() => document.fonts?.status !== 'loading', { timeout: 5000 }).catch(() => {});
  await sleep(800);

  const outputPath = path.join(screenshotDir, `${route.name}.png`);
  await page.screenshot({ path: outputPath, type: 'png' });
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // ---- 教師端 (aaa001 has rich demo data) ----
    const teacherPage = await browser.newPage();
    await teacherPage.setViewport({ width: VW, height: VH });
    // 先到登入頁拿到 origin cookie
    await teacherPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await login(teacherPage, 'aaa001', 'aaa001', 'teacher');
    for (const route of TEACHER_ROUTES) {
      await captureRoute(teacherPage, route);
    }
    await teacherPage.close();

    // ---- 學生端 (115001 王小明 in 五年甲班) ----
    const studentPage = await browser.newPage();
    await studentPage.setViewport({ width: VW, height: VH });
    await studentPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await login(studentPage, '115001', '115001', 'student');
    for (const route of STUDENT_ROUTES) {
      await captureRoute(studentPage, route);
    }
    await studentPage.close();

    console.log(`\nDone — screenshots saved to:\n  ${screenshotDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
