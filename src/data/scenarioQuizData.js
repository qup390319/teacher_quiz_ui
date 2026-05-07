/**
 * 情境考卷資料（治療模組）
 *
 * 定義詳見 docs/spec-08-treatment-cognitive-apprenticeship.md §10
 * 與診斷考卷 (quizData.js) 並列獨立。
 *
 * 目前僅保留 1 份 demo 情境考卷：
 *   scenario-002 → 飽和糖水甜度（節點 INe-II-3-03）
 *
 * 題目文字、情境敘述、開場提問皆移植自 eh 系統 levels.ts 的 QUESTION_CONFIGS，
 * 圖片素材複製到 src/assets/scenarios/。
 */
import sugarLayerImg from '../assets/scenarios/2-1-2-sugar-saturation-chart.png';

/**
 * @typedef {Object} ScenarioQuestion
 * @property {number} index - 題目順序（1-based）
 * @property {string} title - 標題（如「論證議題 1」）
 * @property {string} scenarioText - 情境敘述（多行字串，\n 為段落分隔）
 * @property {string[]=} scenarioImages - 情境圖片 import 路徑（0~2 張）
 * @property {boolean=} scenarioImageZoomable - 是否可點擊放大（預設 false）
 * @property {string} initialMessage - AI 開場提問（步驟 1 由 AI 主動說）
 * @property {string[]} targetMisconceptions - 該題針對的迷思 ID（M01-1 等）
 * @property {string} expertModel - 專家示範範文（治療階段「示範」期 AI 引用）
 */

/**
 * @typedef {Object} ScenarioQuiz
 * @property {string} id - 'scenario-001' 等
 * @property {string} title - 顯示名稱
 * @property {'draft'|'published'} status
 * @property {string} targetNodeId - 主要對應的知識節點
 * @property {string[]} targetMisconceptions - 主要對應的迷思群（聚合自題目）
 * @property {string} createdAt - YYYY-MM-DD
 * @property {ScenarioQuestion[]} questions
 */

export const SCENARIO_QUIZZES_DATA = [
  // ───────────────────────────────────────────────────────────────
  // scenario-002：飽和糖水甜度（2 題）
  // ───────────────────────────────────────────────────────────────
  {
    id: 'scenario-002',
    title: '情境治療 · 飽和糖水甜度',
    status: 'published',
    targetNodeId: 'INe-II-3-03',
    targetMisconceptions: ['M03-1', 'M03-2'],
    createdAt: '2026-04-29',
    questions: [
      {
        index: 1,
        title: '論證議題 1',
        scenarioText:
          '小明想在家裡複製飲料店超甜的「特調砂糖水」。他拿了一杯 100 毫升的水，一平匙一平匙地加入砂糖並不斷攪拌。' +
          '根據實驗紀錄，加到第 7 匙時，小明發現無論他怎麼用力攪拌，杯子底部始終剩下一層白白的砂糖沉澱，無法再消失。\n\n' +
          '小明心想：「既然底部有這麼多砂糖沉澱，那這杯水最底層（靠近沉澱處）的水一定比最上層的水還要甜吧？」' +
          '於是他小心地將上層的糖水倒出一半到 A 杯，再將下層（但不含底部固體砂糖）的糖水倒出另一半到 B 杯，仔細觀察兩杯糖水的顏色是一樣的。\n\n' +
          '問題：你認為 A 杯（上層）和 B 杯（下層）的糖水，哪一杯喝起來比較甜？',
        scenarioImages: [sugarLayerImg],
        scenarioImageZoomable: true,
        initialMessage:
          '你認為 A 杯（上層）和 B 杯（下層）的糖水，哪一杯喝起來比較甜？請先提出你的主張。',
        targetMisconceptions: ['M03-1'],
        expertModel:
          '我來示範專家的思考：我主張 A 杯和 B 杯一樣甜。' +
          '證據是兩杯糖水顏色看起來一樣，這代表溶在水裡的糖濃度相同。' +
          '推理是溶解後的物質會均勻分散在水中，並不會因為靠近沉澱層就比較濃，所以兩杯甜度相同。',
      },
      {
        index: 2,
        title: '論證議題 2',
        scenarioText:
          '接續小明做的實驗，他在已經有沉澱（飽和）的糖水中，又多加了三平匙的砂糖並瘋狂攪拌。' +
          '他認為：「雖然有沉澱，但我加了更多糖，這杯糖水一定會變得比剛才更甜！」\n\n' +
          '問題：在已經有沉澱的情況下，繼續加入砂糖並攪拌，這杯糖水的「甜度（濃度）」會繼續增加嗎？',
        scenarioImages: [sugarLayerImg],
        scenarioImageZoomable: true,
        initialMessage:
          '在已經有沉澱的情況下，繼續加入砂糖並攪拌，這杯糖水的甜度（濃度）會繼續增加嗎？請先說說你的主張。',
        targetMisconceptions: ['M03-2'],
        expertModel:
          '我來示範專家的思考：我主張甜度不會繼續增加。' +
          '證據是杯底已經有沉澱，這代表水已經溶不下更多糖（達到飽和）。' +
          '推理是水在固定溫度下能溶解的糖有上限，超過上限的糖只會沉在底下，不會增加水中糖的濃度，所以甜度不會再上升。',
      },
    ],
  },
];

/* ── 查詢輔助函式 ───────────────────────────────────────────── */

/** 依 ID 取得情境考卷 */
export function getScenarioQuiz(scenarioQuizId) {
  return SCENARIO_QUIZZES_DATA.find((q) => q.id === scenarioQuizId) ?? null;
}

/** 依目標節點 ID 找推薦的情境考卷 */
export function getScenarioQuizzesByNode(nodeId) {
  return SCENARIO_QUIZZES_DATA.filter((q) => q.targetNodeId === nodeId);
}

/** 依目標迷思 ID 找推薦的情境考卷 */
export function getScenarioQuizzesByMisconception(misconceptionId) {
  return SCENARIO_QUIZZES_DATA.filter((q) =>
    q.targetMisconceptions.includes(misconceptionId)
  );
}

/** 取得情境考卷的題目陣列（語意對齊 quizData.getQuizQuestions） */
export function getScenarioQuestions(scenarioQuizId) {
  return getScenarioQuiz(scenarioQuizId)?.questions ?? [];
}
