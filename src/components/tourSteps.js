/**
 * 導覽步驟定義（所有 variant）
 * 由 GuidedTour.jsx 匯入使用
 */

// ─── sidebar ────────────────────────────────────────────────────────────────
export const SIDEBAR_STEPS = [
  {
    target: '[data-tour="sidebar"]',
    content:
      '這是您的導航區。\n\n功能依照教學流程排列，從出題到補救，一步步引導您完成診斷教學。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-quiz"]',
    content:
      '① 出題\n\n在這裡建立或編輯「迷思診斷題組」。\nAI 會從教材中推薦題目供您選用。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-assign"]',
    content:
      '② 派題給班級\n\n題組建好後，將它派發給班級的學生進行作答。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-dashboard"]',
    content:
      '③ 看診斷結果\n\n學生完成作答後，這裡會呈現：\n• 答題分布\n• 迷思排行\n• 個人報告',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-remediation"]',
    content:
      '④ 概念釐清・補救\n\n針對學生的迷思概念，進行概念釐清補救教學。\nAI 會引導學生進行對話式學習。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-classes"]',
    content:
      '班級管理\n\n管理您的班級與學生帳號，包含：\n• 新增班級\n• 匯入學生名單\n• 管理學生帳密',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-knowledge-default"]',
    content:
      '預設知識節點總覽\n\n系統內建的知識結構與常見迷思概念對照表。\n• 水溶液單元 12 個節點\n• 每節點 4 條迷思，共 48 條\n\n此為系統預設，不可編輯。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="flow-knowledge-custom"]',
    content:
      '自定義知識節點總覽\n\n您可以在這裡針對各節點：\n• 自行新增迷思概念\n• 移除自訂的迷思\n\n讓診斷更符合您的教學經驗。\n星空圖的節點結構不會改變。',
    placement: 'right',
    skipBeacon: true,
  },
];

// ─── home ───────────────────────────────────────────────────────────────────
export const HOME_STEPS = [
  {
    target: '[data-tour="sidebar"]',
    content:
      '歡迎使用 SciLens！\n\n本系統專門針對國小五年級自然科學「水溶液」單元，診斷學生常見的迷思概念。\n\n左側是您的導航區，依教學流程排列。\n接下來我們會逐一介紹。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="home-flow-quiz"]',
    linked: '[data-tour="flow-quiz"]',
    content:
      '步驟 ① 出診斷題\n\n首頁這張卡片，與左側「① 出題」對應（已綠色高亮）。\n點任一處都會帶您去建立迷思診斷題組。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="home-flow-assign"]',
    linked: '[data-tour="flow-assign"]',
    content:
      '步驟 ② 派題給班級\n\n把建好的診斷題組指派給學生作答。\n（首頁卡片 ↔ 側邊欄「② 派題給班級」）',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="home-flow-dashboard"]',
    linked: '[data-tour="flow-dashboard"]',
    content:
      '步驟 ③ 看診斷結果\n\n學生作答後，這裡可看到：\n• 答題分布\n• 高頻迷思\n• 個人報告\n（首頁卡片 ↔ 側邊欄「③ 看診斷結果」）',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="home-flow-remediation-edit"]',
    linked: '[data-tour="flow-remediation"]',
    content:
      '步驟 ④ 釐清題組編輯\n\n針對診斷出的迷思，建立概念釐清題組。\n（首頁卡片 ↔ 側邊欄「④ 概念釐清・補救」）',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="home-flow-remediation-assign"]',
    linked: '[data-tour="flow-remediation"]',
    content:
      '步驟 ⑤ 派發釐清題組\n\n把釐清題組派給有對應迷思的學生。\n（仍對應側邊欄「④」群組）',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="home-flow-remediation-result"]',
    linked: '[data-tour="flow-remediation"]',
    content:
      '步驟 ⑥ 概念釐清結果\n\n學生與 AI 完成對話後，這裡查看補救成效。\n（仍對應側邊欄「④」群組）',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="home-knowledge-map"]',
    content:
      '知識節點總覽\n\n水溶液單元共 12 個知識節點：\n• 子主題 A 溶解：5 個\n• 子主題 B 酸鹼：7 個\n\n每節點對應 4 條常見迷思，合計 48 條。\n節點之間有學習順序（箭頭方向），就像星空圖中的連線——這就是「知識結構」。',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── quiz-library ───────────────────────────────────────────────────────────
export const QUIZ_LIBRARY_STEPS = [
  {
    target: '[data-tour="quiz-page-header"]',
    content:
      '出題管理\n\n這裡管理所有的迷思診斷題組。\n題組用於檢測學生在「水溶液」單元中可能存在的迷思概念。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="quiz-new-btn"]',
    content:
      '建立新題組\n\n流程共兩步：\n① 選擇知識節點範圍\n② 編輯題目內容（題幹、選項、迷思對應）',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="quiz-tabs"]',
    content:
      '題組狀態分類\n\n• 全部：顯示所有題組\n• 題庫（已發佈）：可派給學生的\n• 草稿：還在編輯中的\n\n只有「已發佈」的題組才能派發給班級。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="quiz-card-first"]',
    content:
      '題組卡片\n\n每張卡片顯示：題數、涵蓋的知識節點、已派班級。\n\n• 點「編輯」→ 修改題目\n• 點「複製為新題組」→ 快速建立類似題組',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ─── quiz-step1 ─────────────────────────────────────────────────────────────
export const QUIZ_STEP1_STEPS = [
  {
    target: '[data-tour="step1-hero"]',
    content:
      '步驟一：決定出題範圍\n\n選擇本次診斷要涵蓋的知識節點。\n每個節點代表「水溶液」單元中的一個學習概念。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="knowledge-skill-tree"]',
    content:
      '知識結構「星空圖」\n\n• 連線代表學習順序\n• 學生需先掌握下方節點，才能學會上方節點\n• 綠色 = 子主題 A（溶解）\n• 褐色 = 子主題 B（酸鹼）',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="step1-minipath"]',
    content:
      '選取節點\n\n點擊節點方塊來選取或取消。\n被選中的節點會亮起——出題時只會涵蓋這些節點對應的迷思概念。',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── quiz-step2 ─────────────────────────────────────────────────────────────
export const QUIZ_STEP2_STEPS = [
  {
    target: '[data-tour="quiz-title-input"]',
    content:
      '題組名稱\n\n為題組命名，方便日後辨識。\n名稱會顯示在題組列表和派題頁面。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="question-list"]',
    content:
      '題目列表\n\n每題包含「題幹」和數個選項。\n\n什麼是題幹？\n就是題目的主要敘述——描述一個科學情境，讓學生選出正確或錯誤的答案。',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="add-question-area"]',
    content:
      '新增題目\n\n每題需要設定：\n• 題幹（問題敘述）\n• 選項（含正確答案）\n• 各選項對應的迷思概念\n\n例：「把糖放入水中攪拌後，糖的重量會消失嗎？」就是一個典型題幹。',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="coverage-panel"]',
    content:
      '迷思涵蓋狀況\n\n• 綠色打勾 = 該迷思已有對應題目\n• 灰色 = 尚未涵蓋\n\n建議讓每個節點的迷思都至少有一題覆蓋。',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '[data-tour="save-buttons"]',
    content:
      '儲存題組\n\n• 儲存草稿 → 之後再改\n• 發佈 → 加入題庫，可派給班級使用',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── assignment ─────────────────────────────────────────────────────────────
export const ASSIGNMENT_STEPS = [
  {
    target: '[data-tour="assign-page-header"]',
    content:
      '派題管理\n\n將已發佈的題組指派給班級。\n\n矩陣排列方式：\n• 每一列 = 一個班級\n• 每一欄 = 一份題組\n\n班級再多也能自然往下捲動。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="assign-legend"]',
    content:
      '圖例說明\n\n• 虛線框 = 尚未派發\n• 淺綠底 = 待作答\n• 黃色底 = 進行中\n• 深綠底 = 已完成',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="assign-matrix"]',
    content:
      '操作方式\n\n• 點「＋派發」→ 將題組派給該班級，並設定截止日期\n• 點已派的格子 → 管理派發狀態或查看診斷報告',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── knowledge-map ──────────────────────────────────────────────────────────
export const KNOWLEDGE_MAP_STEPS = [
  {
    target: '[data-tour="knowledge-map-hero"]',
    content:
      '預設知識節點總覽\n\n此頁展示水溶液單元的完整知識結構。\n所有知識節點與對應的迷思概念都列在這裡，供您出題時參考。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="knowledge-skill-tree"]',
    content:
      '知識星空圖\n\n• 箭頭方向由下往上，代表學習順序\n• 學生需先掌握基礎節點，才能理解進階概念\n\n這個結構是固定不可更動的。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="misconceptions-table"]',
    content:
      '常見迷思概念表\n\n每個節點有 4 條迷思，共 48 條。\n\n什麼是「迷思概念」？\n學生常見的錯誤理解，例如認為「糖溶解後重量會消失」。\n\n出題時，就是要讓學生的回答暴露出這些迷思。',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── dashboard ──────────────────────────────────────────────────────────────
export const DASHBOARD_STEPS = [
  {
    target: '[data-tour="dash-header"]',
    content:
      '診斷結果\n\n學生完成診斷題組的作答後，所有統計分析結果都呈現在這裡。\n幫助您快速掌握全班的迷思概念分布。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="dash-quiz-selector"]',
    content:
      '題組選擇器\n\n先選擇要查看的題組。\n下拉選單列出所有已派發且有學生作答的診斷題組。\n\n切換題組後，下方所有圖表會同步更新。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="dash-tab-overview"]',
    content:
      '所有班級答題分布\n\n顯示全年級各題的答題狀況：\n• 每題有多少學生答對、答錯\n• 錯誤選項的分布比例\n\n快速找出哪些題目最多人答錯。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="dash-tab-classes"]',
    content:
      '各班級比較\n\n將各班的答題表現並排對照。\n可以看出哪個班級在哪些題目表現較弱，方便安排差異化教學。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="dash-tab-nodes"]',
    content:
      '知識節點答對率\n\n以知識節點為單位統計正確率。\n一眼看出哪些概念是學生普遍掌握的、哪些是共同弱點。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="dash-tab-misconceptions"]',
    content:
      '高頻迷思排行\n\n列出最多學生持有的迷思概念，從高到低排序。\n\n這是安排概念釐清補救教學的重要依據。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="dash-tab-students"]',
    content:
      '個別學生報告\n\n查看每位學生的診斷細節：\n• 各題作答結果\n• 被診斷出的迷思概念\n• AI 追問對話的完整記錄',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ─── class-management ───────────────────────────────────────────────────────
export const CLASS_MANAGEMENT_STEPS = [
  {
    target: '[data-tour="class-page-header"]',
    content:
      '班級管理\n\n在這裡建立和管理各個班級，以及查看每個班級的學生名單與相關資訊。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="class-new-btn"]',
    content:
      '建立新班級\n\n您可以設定：\n• 班級名稱\n• 年級、科目、學年學期\n• 代表色（方便辨識）',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="class-list"]',
    content:
      '班級列表\n\n顯示所有班級，包含學生人數與目前狀態。\n\n點擊任一班級可進入詳情頁：\n• 管理學生帳號\n• 新增或移除學生\n• 編輯班級設定',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── diagnosis-logs ─────────────────────────────────────────────────────────
export const DIAGNOSIS_LOGS_STEPS = [
  {
    target: '[data-tour="logs-page-header"]',
    content:
      '診斷對話紀錄\n\n匯集所有學生在診斷題組中的作答記錄，包含：\n• 題數、正確理解題數\n• 持有迷思題數\n• 最近作答時間',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="logs-filter-bar"]',
    content:
      '篩選器\n\n可依「班級」或「診斷題組」篩選，快速找到特定班級或題組的作答紀錄。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="logs-table"]',
    content:
      '學生作答摘要表\n\n每一列代表一位學生，顯示班級、座號、姓名、題數等。\n\n點擊學生姓名或「查看報告」→ 進入個人詳細報告頁面，查看完整追問對話與診斷結果。',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── treatment-logs ─────────────────────────────────────────────────────────
export const TREATMENT_LOGS_STEPS = [
  {
    target: '[data-tour="treatment-logs-header"]',
    content:
      '概念釐清對話紀錄\n\n記錄每位學生與 AI 的完整概念釐清治療對話歷程。\n方便您了解學生在對話中的表現。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="treatment-logs-filter"]',
    content:
      '篩選器\n\n使用班級與概念釐清題組篩選器，快速找到特定班級或題組的對話紀錄。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="treatment-logs-table"]',
    content:
      '對話紀錄表\n\n列出每位學生的：\n• 對話狀態（進行中 / 已完成）\n• 作答進度\n• 所在階段\n\n點擊「查看對話」→ 進入完整的對話紀錄，作為評估是否需要再教的依據。',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── treatment-outcomes ─────────────────────────────────────────────────────
export const TREATMENT_OUTCOMES_STEPS = [
  {
    target: '[data-tour="treatment-outcomes-header"]',
    content:
      '概念釐清結果\n\n彙整每位學生在概念釐清治療對話後的釐清成效。\n協助您快速決定下一步教學行動。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="treatment-outcomes-filter"]',
    content:
      '篩選器\n\n透過班級與題組篩選器，可聚焦在特定學生群體或特定概念釐清題組的成效分析。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="treatment-outcomes-summary"]',
    content:
      '整體快覽\n\n三張指標卡顯示：\n• 已派發學生總數\n• 已成功釐清的人數\n• 需要特別關注的人數（需引導或未釐清）',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="treatment-outcomes-table"]',
    content:
      '結果表格\n\n以三色階呈現每位學生的結果：\n• 綠 = 已釐清\n• 黃 = 需引導\n• 紅 = 未釐清\n\n讓您一眼掌握哪些學生仍需再教。',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── custom-knowledge-map ───────────────────────────────────────────────────
export const CUSTOM_KNOWLEDGE_MAP_STEPS = [
  {
    target: '[data-tour="custom-km-header"]',
    content:
      '自定義知識節點總覽\n\n在這裡為各知識節點新增自己的迷思概念。\n讓診斷更符合您的教學觀察。\n\n自訂迷思只儲存在您的帳戶，其他老師看不到。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="custom-km-tree"]',
    content:
      '知識星空圖\n\n呈現水溶液單元的完整節點結構與學習順序。\n\n星空圖的節點架構是固定的，不可更動。\n您只能自訂各節點下的迷思概念。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="custom-km-table"]',
    content:
      '迷思概念表\n\n混合顯示兩種迷思：\n• 標記「預設」→ 系統內建，不可修改\n• 標記「自訂」→ 您新增的，可刪除\n\n每個節點旁都有「新增自訂」按鈕。',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="custom-km-add-btn"]',
    content:
      '新增自訂迷思\n\n點擊為任意節點新增迷思概念。\n也可在表格中直接點擊各節點旁的「新增自訂」按鈕，快速為特定節點新增。',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ─── scenario-library ───────────────────────────────────────────────────────
export const SCENARIO_LIBRARY_STEPS = [
  {
    target: '[data-tour="scenario-library-header"]',
    content:
      '概念釐清出題\n\n管理所有「概念釐清題組」。\n\n概念釐清題組是診斷後補救教學的核心工具——學生在 AI 引導的論證對話中，逐步修正自己的迷思概念。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="scenario-create-btn"]',
    content:
      '建立新題組\n\n建立流程：\n① 選定目標知識節點與迷思\n② 填寫概念釐清情境\n③ 設定 AI 開場提問與專家示範\n④ 儲存或發布',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="scenario-cards-list"]',
    content:
      '題組卡片\n\n每張卡片顯示目標節點、目標迷思、已派發班級。\n\n• 點「預覽」→ 查看題目內容\n• 點「派發」→ 跳到派題頁面',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── scenario-create ────────────────────────────────────────────────────────
export const SCENARIO_CREATE_STEPS = [
  {
    target: '[data-tour="scenario-create-header"]',
    content:
      '概念釐清題組建立精靈\n\n設計「論證對話式」補救題組。\nAI 會以四個步驟引導學生修正迷思：\n主張 → 證據 → 推理 → 重述',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="scenario-target-node"]',
    content:
      '基本資訊\n\n① 為題組命名\n② 選擇「目標知識節點」\n③ 從該節點的 4 條迷思中勾選目標迷思\n\n這些設定決定 AI 對話的精準切入點。',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="scenario-questions-area"]',
    content:
      '概念釐清題目\n\n每題包含：\n• 情境敘述（讓學生進入情境）\n• AI 開場提問（引導學生提出主張）\n• 專家示範（學生卡關時 AI 的參考範本）\n\n一份題組可包含多題。',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="scenario-save-buttons"]',
    content:
      '儲存題組\n\n• 儲存為草稿 → 之後繼續修改\n• 儲存並發佈 → 加入題庫，可派發給學生',
    placement: 'top',
    skipBeacon: true,
  },
];

// ─── STEP_MAP ───────────────────────────────────────────────────────────────
export const STEP_MAP = {
  sidebar: SIDEBAR_STEPS,
  home: HOME_STEPS,
  'quiz-library': QUIZ_LIBRARY_STEPS,
  'quiz-step1': QUIZ_STEP1_STEPS,
  'quiz-step2': QUIZ_STEP2_STEPS,
  assignment: ASSIGNMENT_STEPS,
  'knowledge-map': KNOWLEDGE_MAP_STEPS,
  dashboard: DASHBOARD_STEPS,
  'class-management': CLASS_MANAGEMENT_STEPS,
  'diagnosis-logs': DIAGNOSIS_LOGS_STEPS,
  'treatment-logs': TREATMENT_LOGS_STEPS,
  'treatment-outcomes': TREATMENT_OUTCOMES_STEPS,
  'custom-knowledge-map': CUSTOM_KNOWLEDGE_MAP_STEPS,
  'scenario-library': SCENARIO_LIBRARY_STEPS,
  'scenario-create': SCENARIO_CREATE_STEPS,
};
