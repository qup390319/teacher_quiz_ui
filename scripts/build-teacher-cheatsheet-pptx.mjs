/**
 * 產生「教師端懶人包」PPTX：
 *  - 教師端三步驟流程：出題 → 派題 → 看報表
 *  - 班級管理
 *  - 學生端操作導覽
 *  - 提供測試帳號：user001 / user001
 *
 * 設計：white background, 木框棕色文字, step badge 用彩色圓圈.
 * 16:9, 13.33 × 7.5 inches.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import pptxgen from 'pptxgenjs';

const root = process.cwd();
const SHOT = (n) => path.join(root, 'screenshot', 'cheatsheet', n);
const OUT = path.join(root, '教師端懶人包_SciLens.pptx');

// ── 色票（取自 spec-07 木框冒險風） ───────────────────────────────
const C = {
  BG: 'FFFFFF',
  TITLE: '5A3E22',        // 深棕
  SUB: '7A5232',          // 中棕
  BODY: '3F2E1A',         // 內文
  MUTED: '8B7355',
  WOOD: '8B5E3C',         // 木框
  CREAM: 'FFF8E7',        // 內層淺米
  CREAM_DEEP: 'FBE9C7',
  GREEN: '65A626',        // STEP 1 出題
  ORANGE: 'D08B2E',       // STEP 2 派題
  BLUE: '2D8AC4',         // STEP 3 看報表 / 學生端
  RED: 'C0392B',
  GOLD: 'F4C545',
};

// 字型：CJK 友善
const F_H = 'Microsoft JhengHei';
const F_B = 'Microsoft JhengHei';

const W = 13.33, H = 7.5;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5

// ── helpers ───────────────────────────────────────────────────
function addTitleBlock(s, { title, kicker, kickerColor = C.WOOD }) {
  if (kicker) {
    s.addText(kicker, {
      x: 0.5, y: 0.32, w: 12.3, h: 0.35,
      fontFace: F_H, fontSize: 12, bold: true, color: kickerColor,
      charSpacing: 4,
    });
  }
  s.addText(title, {
    x: 0.5, y: kicker ? 0.62 : 0.4, w: 12.3, h: 0.7,
    fontFace: F_H, fontSize: 30, bold: true, color: C.TITLE,
  });
}

function addScreenshot(s, file, { x = 0.45, y = 1.55, w = 7.6, h = 4.75 } = {}) {
  // 細棕色外框
  s.addShape('rect', { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12,
    fill: { color: C.WOOD }, line: { color: C.WOOD, width: 0 } });
  s.addImage({ path: SHOT(file), x, y, w, h });
}

function addStepBadge(s, n, color, { x = 8.35, y = 1.55 } = {}) {
  s.addShape('ellipse', { x, y, w: 0.9, h: 0.9,
    fill: { color }, line: { color, width: 0 } });
  s.addText(String(n), {
    x, y, w: 0.9, h: 0.9,
    fontFace: F_H, fontSize: 36, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle',
  });
}

function addRightPanel(s, { sectionLabel, sectionLabelColor, heading, bullets, footnote }) {
  const X = 8.4, W_R = 4.5;
  let y = 1.6;
  if (sectionLabel) {
    s.addText(sectionLabel, {
      x: X + 1.1, y: y + 0.05, w: W_R - 1.1, h: 0.4,
      fontFace: F_H, fontSize: 13, bold: true, color: sectionLabelColor || C.WOOD,
      charSpacing: 3,
    });
    y += 0.45;
  }
  s.addText(heading, {
    x: X, y: y + 0.42, w: W_R, h: 0.9,
    fontFace: F_H, fontSize: 22, bold: true, color: C.TITLE,
  });
  // bullets
  const items = bullets.map((b) => ({
    text: b,
    options: {
      bullet: { code: '25CF' }, // ●
      fontFace: F_B, fontSize: 14, color: C.BODY,
      paraSpaceAfter: 8,
    },
  }));
  s.addText(items, {
    x: X, y: y + 1.45, w: W_R, h: 4.0,
    fontFace: F_B, fontSize: 14, color: C.BODY,
    lineSpacingMultiple: 1.25, valign: 'top',
  });

  if (footnote) {
    s.addShape('roundRect', {
      x: X, y: 6.40, w: W_R, h: 0.50,
      fill: { color: C.CREAM }, line: { color: C.CREAM_DEEP, width: 1 },
      rectRadius: 0.1,
    });
    s.addText(footnote, {
      x: X + 0.15, y: 6.40, w: W_R - 0.3, h: 0.50,
      fontFace: F_B, fontSize: 11, color: C.SUB, italic: true,
      valign: 'middle',
    });
  }
}

function addFooter(s, label) {
  s.addText('SciLens · 國小自然「水溶液」迷思概念診斷系統', {
    x: 0.5, y: 7.0, w: 8.5, h: 0.3,
    fontFace: F_B, fontSize: 9, color: C.MUTED,
  });
  s.addText(label, {
    x: 9.0, y: 7.0, w: 3.83, h: 0.3,
    fontFace: F_B, fontSize: 9, color: C.MUTED, align: 'right',
  });
}

// ════════════════════════════════════════════════════════════════
// Slide 1 — Cover
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };

  // 大色塊 (左側 cream, 右側白)
  s.addShape('rect', { x: 0, y: 0, w: 5.4, h: H,
    fill: { color: C.CREAM }, line: { color: C.CREAM, width: 0 } });

  s.addText('SciLens', {
    x: 0.6, y: 0.6, w: 4.5, h: 0.6,
    fontFace: F_H, fontSize: 24, bold: true, color: C.WOOD, charSpacing: 4,
  });
  s.addText('迷思概念診斷系統', {
    x: 0.6, y: 1.1, w: 4.5, h: 0.5,
    fontFace: F_H, fontSize: 16, color: C.SUB,
  });

  // 中央大標題
  s.addText('教師端 懶人包', {
    x: 5.8, y: 2.3, w: 7.0, h: 1.2,
    fontFace: F_H, fontSize: 56, bold: true, color: C.TITLE,
  });
  s.addText('5 分鐘上手  ·  出題 → 派題 → 看報表', {
    x: 5.8, y: 3.5, w: 7.0, h: 0.6,
    fontFace: F_H, fontSize: 22, color: C.SUB,
  });

  // 測試帳號區塊
  s.addShape('roundRect', { x: 5.8, y: 4.6, w: 6.8, h: 1.6,
    fill: { color: C.CREAM }, line: { color: C.WOOD, width: 2 },
    rectRadius: 0.18 });
  s.addText('您的測試帳號', {
    x: 6.0, y: 4.7, w: 6.4, h: 0.35,
    fontFace: F_H, fontSize: 13, bold: true, color: C.WOOD, charSpacing: 3,
  });
  s.addText([
    { text: 'user001', options: { fontFace: F_H, fontSize: 36, bold: true, color: C.GREEN } },
    { text: '   /   ', options: { fontFace: F_H, fontSize: 26, color: C.MUTED } },
    { text: 'user001', options: { fontFace: F_H, fontSize: 36, bold: true, color: C.GREEN } },
  ], {
    x: 6.0, y: 5.05, w: 6.4, h: 0.7, align: 'left', valign: 'middle',
  });
  s.addText('帳號 / 密碼 (預設密碼與帳號相同，登入後請自行修改)', {
    x: 6.0, y: 5.75, w: 6.4, h: 0.35,
    fontFace: F_B, fontSize: 12, color: C.SUB,
  });

  s.addText('給國小自然科老師的快速入門指南', {
    x: 0.6, y: 6.7, w: 4.5, h: 0.4,
    fontFace: F_B, fontSize: 12, color: C.SUB, italic: true,
  });
  s.addText('共 15 頁', {
    x: 11.5, y: 6.95, w: 1.3, h: 0.4,
    fontFace: F_B, fontSize: 11, color: C.MUTED, align: 'right',
  });
}

// ════════════════════════════════════════════════════════════════
// Slide 2 — 登入
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: 'STEP 0  ·  從這裡開始', title: '登入 — 4 個動作就進到教師主頁' });
  addScreenshot(s, '01b-login-modal.png');
  addStepBadge(s, '0', C.WOOD);
  addRightPanel(s, {
    sectionLabel: '登入畫面',
    sectionLabelColor: C.WOOD,
    heading: '輸入測試帳號 user001',
    bullets: [
      '開啟系統首頁 (老師端網址)',
      '點選綠色的「我是老師」卡片',
      '帳號欄輸入：user001',
      '密碼欄輸入：user001 (預設與帳號相同)',
      '按下「登入」即進入教師主頁',
    ],
    footnote: '提醒：登入後可在右上角圖示處修改密碼。',
  });
  addFooter(s, '2 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 3 — 教師主頁總覽
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: '主畫面導覽', title: '一張地圖看懂整個教師端' });
  addScreenshot(s, '02-teacher-home.png');
  addStepBadge(s, '★', C.GOLD);
  addRightPanel(s, {
    sectionLabel: 'TEACHER HOME',
    sectionLabelColor: C.WOOD,
    heading: '所有功能 = 三步驟流程',
    bullets: [
      '左側選單按 ① 出題 → ② 派題 → ③ 看結果 排列',
      '中央卡片顯示目前進度 (已建幾份題組、已派幾班)',
      '橘色橫幅是「新手導覽」，可一鍵啟動教學',
      '右上「操作導覽」按鈕在每一頁都有，隨時呼叫',
    ],
    footnote: '本系統採三步驟流程，做完一步即可進入下一步。',
  });
  addFooter(s, '3 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 4 — STEP 1 出題
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: 'STEP 1  ·  出題', title: '用「出題精靈」2 步驟建立題組', kickerColor: C.GREEN });
  addScreenshot(s, '03-quiz-create-step1.png');
  addStepBadge(s, 1, C.GREEN);
  addRightPanel(s, {
    sectionLabel: 'QUIZ WIZARD',
    sectionLabelColor: C.GREEN,
    heading: '一份題組 = 一次診斷',
    bullets: [
      '左側點「① 出診斷題 → 診斷題組編輯」',
      '步驟 1：決定診斷範圍 (選子主題、節點)',
      '步驟 2：系統依範圍推薦試題與迷思',
      '帶 ✦ AI 圖示的功能由後台 AI 輔助',
      '完成後存檔，題組會進入「題庫」備用',
    ],
    footnote: '初次使用建議直接用系統內建的「水溶液」示範題組。',
  });
  addFooter(s, '4 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 5 — 題庫管理
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: 'STEP 1  ·  延伸功能', title: '題庫 — 隨時編修與重複使用', kickerColor: C.GREEN });
  addScreenshot(s, '04-quiz-library.png');
  addStepBadge(s, 1, C.GREEN);
  addRightPanel(s, {
    sectionLabel: 'QUIZ LIBRARY',
    sectionLabelColor: C.GREEN,
    heading: '所有題組集中管理',
    bullets: [
      '已建立的題組都收進「題組總覽」',
      '每張卡片顯示：題數、節點數、涵蓋範圍',
      '可一鍵 編輯 / 複製 / 封存',
      '系統內建 2 份示範題組 (水溶液 第一/二次)',
      '示範題組可直接派發，不必另外建立',
    ],
    footnote: '提示：建議先用示範題組跑完一輪流程再自行出題。',
  });
  addFooter(s, '5 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 6 — STEP 2 派題
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: 'STEP 2  ·  派題', title: '一鍵把題組指派給班級', kickerColor: C.ORANGE });
  addScreenshot(s, '05-assignments.png');
  addStepBadge(s, 2, C.ORANGE);
  addRightPanel(s, {
    sectionLabel: 'ASSIGNMENTS',
    sectionLabelColor: C.ORANGE,
    heading: '「題組 × 班級」矩陣',
    bullets: [
      '左側點「② 派題給班級 → 派發診斷題組」',
      '矩陣每一格 = 一份題組對一個班級',
      '虛線「+ 派發」表示尚未派發，點擊即可派',
      '實線格子顯示「待作答 X/20 人」進度',
      '上方統計卡同步顯示：總數 / 進行中 / 已完成',
    ],
    footnote: '派題後學生登入即可在主頁看到新任務。',
  });
  addFooter(s, '6 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 7 — STEP 3 報表總覽
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: 'STEP 3  ·  看報表', title: '儀表板 — 全班一頁看完', kickerColor: C.BLUE });
  addScreenshot(s, '06-dashboard-overview.png');
  addStepBadge(s, 3, C.BLUE);
  addRightPanel(s, {
    sectionLabel: 'DASHBOARD · 答題分布',
    sectionLabelColor: C.BLUE,
    heading: '三個關鍵指標一行掃完',
    bullets: [
      '左側點「③ 看診斷結果 → 儀表板」',
      '上排卡片：班級答對率 / 完成率 / 達標班級數',
      '下方「最弱節點 Top3」找出最需要補的概念',
      '下方「高頻迷思 Top3」找出最普遍的迷思',
      '可篩選題組 / 學年度 / 學期',
    ],
    footnote: '此頁適合教學會議或備課時的「全班健診」。',
  });
  addFooter(s, '7 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 8 — STEP 3 高頻迷思
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: 'STEP 3  ·  看報表', title: '高頻迷思排行 — 找出最該補救的觀念', kickerColor: C.BLUE });
  addScreenshot(s, '08-dashboard-misconceptions.png');
  addStepBadge(s, 3, C.BLUE);
  addRightPanel(s, {
    sectionLabel: 'DASHBOARD · 高頻迷思',
    sectionLabelColor: C.BLUE,
    heading: '依持有率排序所有迷思',
    bullets: [
      '上方分頁切到「高頻迷思排行」',
      '紅圈 ≥45%：急需年級層級補救',
      '橘圈 30–44%：建議列入下次教學重點',
      '灰圈 <30%：低風險，個別追蹤即可',
      '點「查看涉及學生」可直接看名單',
    ],
    footnote: '建議從紅圈迷思開始安排補救教學。',
  });
  addFooter(s, '8 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 9 — STEP 3 個別學生
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: 'STEP 3  ·  看報表', title: '個別學生報告 — 每位學生的完整檔案', kickerColor: C.BLUE });
  addScreenshot(s, '09-dashboard-students.png');
  addStepBadge(s, 3, C.BLUE);
  addRightPanel(s, {
    sectionLabel: 'DASHBOARD · 個別學生',
    sectionLabelColor: C.BLUE,
    heading: '一張表掃完全班學習狀況',
    bullets: [
      '切到「個別學生報告」分頁',
      '欄位：班級 / 座號 / 姓名 / 題數 / 理解 / 持有迷思 / 最近作答',
      '上方可依班級篩選、依姓名/座號搜尋',
      '點「查看報告」進入該生詳細頁面',
      '便於親師溝通或個別輔導時參考',
    ],
    footnote: '此頁可作為導師期末個別會談時的依據。',
  });
  addFooter(s, '9 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 10 — 班級管理總覽
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: '班級管理', title: '班級總覽 — 學年度切換與新增班級', kickerColor: C.WOOD });
  addScreenshot(s, '10-classes.png');
  addStepBadge(s, '班', C.WOOD);
  addRightPanel(s, {
    sectionLabel: 'CLASSES',
    sectionLabelColor: C.WOOD,
    heading: '一個老師可帶多班',
    bullets: [
      '左側「班級 → 班級名單管理」進入此頁',
      '上方按鈕可切換：學年度、學期、是否含封存',
      '列表顯示：班級名稱、學生人數、學期',
      '右上「+ 新增班級」開啟設定彈窗',
      '舊班級可「封存」，需要時再展開',
    ],
    footnote: '示範資料：五年甲班 (20)、乙班 (18)、丙班 (22)。',
  });
  addFooter(s, '10 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 11 — 班級名單 (學生帳號)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: '班級管理', title: '班級名單 — 看得到、改得了學生密碼', kickerColor: C.WOOD });
  addScreenshot(s, '11-class-detail.png');
  addStepBadge(s, '班', C.WOOD);
  addRightPanel(s, {
    sectionLabel: 'ROSTER · 學生帳密',
    sectionLabelColor: C.WOOD,
    heading: '老師可直接協助學生登入',
    bullets: [
      '點任一班級進入詳細頁',
      '系統自動產生 5 碼學號 (例如 115001)',
      '密碼欄按 👁 圖示可顯示明文 (僅老師可見)',
      '「重設密碼」可一鍵恢復為預設值',
      '學生忘記密碼時，老師可直接告知',
    ],
    footnote: '預設密碼 = 學號本身，例如帳號 115001 / 密碼 115001。',
  });
  addFooter(s, '11 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 12 — 學生端 登入 + 主頁
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: '學生端  ·  老師需先熟悉才能教學生', title: '學生登入 → 看到老師指派的任務', kickerColor: C.BLUE });
  addScreenshot(s, '20-student-home.png');
  addStepBadge(s, '生', C.BLUE);
  addRightPanel(s, {
    sectionLabel: 'STUDENT HOME',
    sectionLabelColor: C.BLUE,
    heading: '介面為小朋友設計，按一下就懂',
    bullets: [
      '登入頁點藍色的「我是學生」卡片',
      '帳號 = 5 碼學號 (老師在班級名單可查到)',
      '預設密碼與帳號相同',
      '主頁出現「待挑戰任務」卡片 (老師派題後出現)',
      '「已完成的好挑戰」收錄已做過的題組',
    ],
    footnote: '請先用學生帳號 (例如 115001) 自己跑一輪再教學生。',
  });
  addFooter(s, '12 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 13 — 學生答題
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: '學生端', title: '答題介面 — 像聊天一樣回答 AI 偵探', kickerColor: C.BLUE });
  addScreenshot(s, '21-student-quiz.png');
  addStepBadge(s, '生', C.BLUE);
  addRightPanel(s, {
    sectionLabel: 'STUDENT QUIZ',
    sectionLabelColor: C.BLUE,
    heading: '對話式診斷，降低壓力',
    bullets: [
      'AI「科學偵探」一次只問一題，語氣溫和',
      '學生可用自己的話回答，不必選擇題',
      '系統即時判讀學生想法、引導反思',
      '上方進度條顯示作答進度',
      '中途離開可下次再回來繼續',
    ],
    footnote: '教學提示：可請學生大聲念出 AI 的問題，幫助理解。',
  });
  addFooter(s, '13 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 14 — 學生報告
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: '學生端', title: '學習體檢表 — 學生看得懂的個人報告', kickerColor: C.BLUE });
  addScreenshot(s, '22-student-report.png');
  addStepBadge(s, '生', C.BLUE);
  addRightPanel(s, {
    sectionLabel: 'STUDENT REPORT',
    sectionLabelColor: C.BLUE,
    heading: '兩個數字 + 一份小迷思清單',
    bullets: [
      '作答結束後自動生成',
      '上方：「掌握的概念」與「待更新的觀念」',
      '下方：每條迷思清楚對照「我目前的想法 vs 科學的說法」',
      '附「可能的原因」與生活情境補充',
      '學生可帶回家給家長看，作為親子科學話題',
    ],
    footnote: '這頁也會出現在老師端的「個別學生報告」內，內容一致。',
  });
  addFooter(s, '14 / 15');
}

// ════════════════════════════════════════════════════════════════
// Slide 15 — 結語：重點懶人包
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.BG };
  addTitleBlock(s, { kicker: '重點整理', title: '記住這三步驟，就能用整套系統' });

  // 三個 step 卡片
  const cards = [
    { n: 1, color: C.GREEN,  title: '出題',   sub: '出題精靈 / 題庫管理',
      bullets: ['左側「① 診斷題組編輯」', '可直接用內建示範題組'] },
    { n: 2, color: C.ORANGE, title: '派題',   sub: '題組 × 班級矩陣',
      bullets: ['左側「② 派發診斷題組」', '點空白格 = 派發'] },
    { n: 3, color: C.BLUE,   title: '看報表', sub: '儀表板 / 高頻迷思 / 個別學生',
      bullets: ['左側「③ 儀表板」', '紅圈迷思優先補救'] },
  ];

  const cardY = 1.55, cardH = 3.2, gap = 0.3;
  const totalW = 12.3, cardW = (totalW - gap * 2) / 3;
  cards.forEach((c, i) => {
    const x = 0.5 + (cardW + gap) * i;
    s.addShape('roundRect', { x, y: cardY, w: cardW, h: cardH,
      fill: { color: C.CREAM }, line: { color: c.color, width: 2 }, rectRadius: 0.18 });
    // badge
    s.addShape('ellipse', { x: x + 0.4, y: cardY + 0.4, w: 0.85, h: 0.85,
      fill: { color: c.color }, line: { color: c.color, width: 0 } });
    s.addText(String(c.n), { x: x + 0.4, y: cardY + 0.4, w: 0.85, h: 0.85,
      fontFace: F_H, fontSize: 32, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle' });
    // title
    s.addText(c.title, { x: x + 1.4, y: cardY + 0.45, w: cardW - 1.5, h: 0.55,
      fontFace: F_H, fontSize: 28, bold: true, color: C.TITLE });
    s.addText(c.sub, { x: x + 1.4, y: cardY + 1.0, w: cardW - 1.5, h: 0.4,
      fontFace: F_B, fontSize: 13, color: C.SUB });
    // bullets
    s.addText(
      c.bullets.map((b) => ({ text: b, options: {
        bullet: { code: '25CF' }, fontFace: F_B, fontSize: 13, color: C.BODY,
        paraSpaceAfter: 4 } })),
      { x: x + 0.4, y: cardY + 1.65, w: cardW - 0.7, h: 1.5, valign: 'top' },
    );
  });

  // 重點 callout
  s.addShape('roundRect', { x: 0.5, y: 5.05, w: 12.3, h: 1.7,
    fill: { color: C.CREAM_DEEP }, line: { color: C.WOOD, width: 2 }, rectRadius: 0.18 });
  s.addText('您的測試帳號', { x: 0.85, y: 5.15, w: 4, h: 0.4,
    fontFace: F_H, fontSize: 13, bold: true, color: C.WOOD, charSpacing: 3 });
  s.addText([
    { text: 'user001', options: { fontFace: F_H, fontSize: 36, bold: true, color: C.GREEN } },
    { text: '   /   ', options: { fontFace: F_H, fontSize: 24, color: C.MUTED } },
    { text: 'user001', options: { fontFace: F_H, fontSize: 36, bold: true, color: C.GREEN } },
  ], { x: 0.85, y: 5.55, w: 5.5, h: 0.7, valign: 'middle' });
  s.addText([
    { text: '小撇步：', options: { bold: true, color: C.TITLE } },
    { text: '每頁右上角都有「操作導覽」按鈕，',
      options: { color: C.BODY } },
    { text: '隨時可呼叫詳細的逐步說明。', options: { color: C.BODY } },
  ], { x: 6.5, y: 5.25, w: 6.0, h: 0.5,
    fontFace: F_B, fontSize: 13, valign: 'middle' });
  s.addText([
    { text: '學生帳號：', options: { bold: true, color: C.TITLE } },
    { text: '在「班級名單」可查到並一鍵告知，預設密碼 = 學號。',
      options: { color: C.BODY } },
  ], { x: 6.5, y: 5.85, w: 6.0, h: 0.5,
    fontFace: F_B, fontSize: 13, valign: 'middle' });

  addFooter(s, '15 / 15');
}

// ── write ────────────────────────────────────────────────────
await pres.writeFile({ fileName: OUT });
console.log(`\n✓ Wrote ${OUT}`);
console.log(`  size: ${(await fs.stat(OUT)).size} bytes`);
