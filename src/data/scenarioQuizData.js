/**
 * 概念釐清題組資料
 *
 * 定義詳見 docs/spec-08-treatment-cognitive-apprenticeship.md §10
 * 與診斷題組 (quizData.js) 並列獨立。
 *
 * 目前僅保留 1 份 demo 概念釐清題組：
 *   scenario-002 → 飽和糖水甜度（節點 INe-II-3-03）
 *
 * 題目文字、概念釐清敘述、開場提問皆移植自 eh 系統 levels.ts 的 QUESTION_CONFIGS，
 * 圖片素材複製到 src/assets/scenarios/。
 */
import sugarLayerImg from '../assets/scenarios/2-1-2-sugar-saturation-chart.png';

/**
 * @typedef {Object} ScenarioQuestion
 * @property {number} index - 題目順序（1-based）
 * @property {string} title - 標題（如「論證議題 1」）
 * @property {string} scenarioText - 概念釐清敘述（多行字串，\n 為段落分隔）
 * @property {string[]=} scenarioImages - 概念釐清圖片 import 路徑（0~2 張）
 * @property {boolean=} scenarioImageZoomable - 是否可點擊放大（預設 false）
 * @property {string} initialMessage - AI 開場提問（步驟 1 由 AI 主動說）
 * @property {string[]} targetMisconceptions - 該題針對的迷思 ID（M01-1 等）
 * @property {string} expertModel - 專家示範範文（概念釐清「示範」期 AI 引用）
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
    title: '概念釐清 · 飽和糖水甜度',
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
          '如果是我，我會先比較兩杯糖水的顏色。題目說 A 杯和 B 杯看起來顏色一樣，這個線索代表什麼呢？\n\n' +
          '你覺得，如果兩杯糖的濃度不同，顏色會一樣嗎？',
      },
      {
        index: 2,
        title: '論證議題 2',
        scenarioText:
          '接續小明做的實驗。小明原本在第 7 匙時，已經發現杯底開始出現白白的砂糖沉澱，' +
          '表示糖水已經接近或達到飽和。這時他又多加了 3 平匙砂糖，並且瘋狂攪拌。\n\n' +
          '小明認為：「雖然有沉澱，但我加了更多糖，這杯糖水一定會變得比剛才更甜！」\n\n' +
          '題目附有燒杯示意圖、實驗紀錄表和甜度變化圖，內容包括：\n' +
          '・第 1 匙：完全溶解，紅褐色糖水（極淡）\n' +
          '・第 2 匙：完全溶解，紅褐色糖水（淡）\n' +
          '・第 3 匙：完全溶解，紅褐色糖水（中）\n' +
          '・第 6 匙：幾乎完全溶解，深紅褐色糖水\n' +
          '・第 7 匙：無法再溶解，開始出現沉澱\n' +
          '・甜度關係圖：前面加糖時甜度持續上升；到第 7 匙左右達到飽和後，甜度不再增加\n' +
          '・燒杯圖：底部有未溶解砂糖沉澱，表示有一部分糖沒有再溶進糖水中\n\n' +
          '問題：你同意小明的想法嗎？為什麼？',
        scenarioImages: [sugarLayerImg],
        scenarioImageZoomable: true,
        initialMessage: '你同意小明的想法嗎？為什麼？請先說說你的主張。',
        targetMisconceptions: ['M03-2'],
        expertModel:
          '如果是我，我會先看甜度變化圖。前面加糖時甜度一直上升，那到了第 7 匙之後，甜度有沒有繼續上升呢？\n\n' +
          '你看圖表，到第 7 匙後，甜度有繼續增加嗎？',
      },
    ],
  },
];

/* ── 查詢輔助函式 ───────────────────────────────────────────── */

/** 依 ID 取得概念釐清題組 */
export function getScenarioQuiz(scenarioQuizId) {
  return SCENARIO_QUIZZES_DATA.find((q) => q.id === scenarioQuizId) ?? null;
}

/** 依目標節點 ID 找推薦的概念釐清題組 */
export function getScenarioQuizzesByNode(nodeId) {
  return SCENARIO_QUIZZES_DATA.filter((q) => q.targetNodeId === nodeId);
}

/** 依目標迷思 ID 找推薦的概念釐清題組 */
export function getScenarioQuizzesByMisconception(misconceptionId) {
  return SCENARIO_QUIZZES_DATA.filter((q) =>
    q.targetMisconceptions.includes(misconceptionId)
  );
}

/** 取得概念釐清題組的題目陣列（語意對齊 quizData.getQuizQuestions） */
export function getScenarioQuestions(scenarioQuizId) {
  return getScenarioQuiz(scenarioQuizId)?.questions ?? [];
}
