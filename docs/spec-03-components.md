# SPEC-03: Components / 共用元件規格

## 1. 元件總覽

| 元件名稱 | 檔案路徑 | 用途 |
|----------|----------|------|
| `TeacherLayout` | `src/components/TeacherLayout.jsx` | 教師端頁面佈局（側邊欄 + 內容區） |
| `RequireAuth` | `src/components/RequireAuth.jsx` | 受保護路由 wrapper（spec-13 §8.2，P1） |
| `StepIndicator` | `src/components/StepIndicator.jsx` | 多步驟精靈的進度指示器 |
| `InfoButton` | `src/components/InfoButton.jsx` | 圓形資訊按鈕，觸發 InfoDrawer |
| `InfoDrawer` | `src/components/InfoDrawer.jsx` | 側邊滑出面板，顯示資料計算說明 |
| `DistractorSuggestPopover` | `src/components/teacher/DistractorSuggestPopover.jsx` | **N6** 干擾選項建議彈窗（出題精靈用，spec-12，P2） |
| `EditQuestionModal` | `src/components/teacher/quizEditor/EditQuestionModal.jsx` | 出題精靈步驟二的單題編輯 modal（題幹 / 節點 / 選項 / N6 整合 / AI 潤飾題幹 / AI 建議選項） |
| `AssignPopover` | `src/pages/teacher/AssignmentMatrixParts.jsx` | 派題確認 popover（截止日期 + 派發模式選擇：診斷模式 / 複習模式） |
| `DeleteQuestionModal` | `src/components/teacher/quizEditor/DeleteQuestionModal.jsx` | 出題精靈刪除題目確認 modal |
| `PreviewQuizModal` | `src/components/teacher/quizEditor/PreviewQuizModal.jsx` | 出題精靈步驟二的學生端預覽 modal |
| `CoveragePanel` | `src/components/teacher/quizEditor/CoveragePanel.jsx` | 出題精靈步驟二的迷思涵蓋率 + 「補洞」chips；點擊未覆蓋的迷思 chip 觸發 `onAddForMisconception(nodeId, misconceptionId)` 建立預填新題 |
| `QuestionImportDrawer` | `src/components/teacher/quizEditor/QuestionImportDrawer.jsx` | 出題精靈步驟二的「從題庫挑題」右側抽屜；展開既有題組後勾選題目，匯入時 deep clone 並 append 到當前 `quizQuestions` |
| `KnowledgeSkillTree` | `src/components/teacher/KnowledgeSkillTree.jsx` | 知識路徑技能樹（深木紋夜晚地圖風 / Mockup J-1）— SVG 六角節點 + 階段欄位（1–6）+ A 綠系/B 橘系階段漸層 + 銳利輪廓 + 背後柔光暈；支援 `selectable` 模式（未勾選黯淡灰褐 + 虛線；已勾選明亮發光 + 綠 ✓ 徽章）。整合於 `KnowledgeMap`（純展示）、`CustomKnowledgeMap`（純展示）、`Step1Nodes`（勾選模式） |
| `AIFollowUpPanel` | `src/pages/student/followUp/AIFollowUpPanel.jsx` | 第二層 AI 追問底部面板（題目回顧 + 輪次 + 文字輸入框） |
| `BottomPanel` / `OptionsPanel` / `DonePanel` | `src/pages/student/studentQuizPanels.jsx` | StudentQuiz 第一層選項面板與完成 loading |

### 1.1 學生端共用元件

| 元件名稱 | 檔案路徑 | 用途 |
|---------|---------|------|
| `StudentSettingsDrawer` | `src/components/student/StudentSettingsDrawer.jsx` | 學生端設定抽屜（字體大小、個人資訊、關於系統、登出） |

---

## 2. TeacherLayout

### 檔案
`src/components/TeacherLayout.jsx`

### 功能
- 為所有教師端頁面提供統一的側邊欄導航佈局
- 側邊欄頂部顯示品牌標識：放大鏡 icon + wordmark `SciLens`，副標 `迷思概念診斷 · 教師端`
- 側邊欄包含導航選單項目
- 支援登出功能（返回首頁 `/`）
- 內容區為 `children` 插槽

### Props
| Prop | 型別 | 必填 | 說明 |
|------|------|------|------|
| `children` | ReactNode | 是 | 頁面主內容 |

### 側邊欄導航項目

導航選單依「教學工作流」分為四個區段（section divider）：**題組 → 看結果 → 班級 → 其他**。
出題、派題、診斷結果採「可展開群組」設計（chevron + 點擊切換 + 路徑命中自動展開高亮）。

**無分類（頂部）**:
| 項目名稱 | 路由目標 | 圖示 |
|----------|----------|------|
| 首頁 | `/teacher` | Home icon |

**題組（section: 題組）**:
| 項目名稱 | 路由目標 | 圖示 | 備註 |
|----------|----------|------|------|
| 出題 | `/teacher/quizzes` | Pencil icon | 診斷題組編輯入口 |
| 派題 | `/teacher/assignments` | Send icon | 診斷題組派題管理 |

**看結果（section: 看結果）**:
| 項目名稱 | 路由目標 | 圖示 | 備註 |
|----------|----------|------|------|
| 診斷結果 | `/teacher/dashboard/*` | Chart icon | **可展開群組**，子項命中時自動展開並高亮頂層按鈕 |

**「診斷結果」子選單**（與舊版相同）:
| 子項名稱 | 路由目標 |
|----------|----------|
| 所有班級總覽 | `/teacher/dashboard/overview` |
| 各班學習狀況 | `/teacher/dashboard/classes` |
| 知識節點跨班比較 | `/teacher/dashboard/nodes` |
| 跨班高頻迷思 | `/teacher/dashboard/misconceptions` |
| 各班詳細報告 | `/teacher/dashboard/class-detail` |

**班級（section: 班級）**:
| 項目名稱 | 路由目標 | 圖示 |
|----------|----------|------|
| 班級管理 | `/teacher/classes` | Users icon |

**其他（section: 其他）**:
| 項目名稱 | 路由目標 | 圖示 |
|----------|----------|------|
| (預設) 知識節點總覽 | `/teacher/knowledge-map` | Grid icon |
| (自定義) 知識節點總覽 | `/teacher/custom-knowledge-map` | Grid icon |

### 行為
- **RWD（spec-07 §7.3）**：
  - **`≥ md`（≥ 768px）**：固定側欄 `w-60`，左右兩欄 flex 佈局（既有行為）
  - **`< md`（< 768px）**：側欄改成從左滑入的 drawer
    - 主內容頂部顯示 sticky 漢堡列（左 menu icon、右 mini SciLens logo）
    - 點漢堡開抽屜（`fixed inset-0 z-40`）+ 半透明 backdrop
    - 抽屜寬 `w-72 max-w-[85vw]`，`-translate-x-full` ↔ `translate-x-0` 滑動
    - 路由切換時自動關閉（`useEffect` 監聽 `location.pathname`）
    - 開啟時 lock body scroll
- 當前路由對應的選單項目以高亮色顯示（`bg-[#C8EAAE]` + `border-[#8FC87A]`）
- 首頁路由使用 `end` 屬性避免子路由也高亮
- **可收合群組**：診斷結果（5 個子項，預設收合避免 sidebar 過長）。共用 `isGroupActive(children, pathname)` 判斷子項是否命中當前路徑。
  - 路徑命中任一子項時，頂層按鈕高亮 + 自動展開
  - 點擊頂層按鈕切換展開覆寫狀態（`openOverrides[group]`），但路徑命中時恆強制展開
- **子項命中時**以淺綠 outline (`bg-[#EEF5E6]` + `border-[#8FC87A]`) 標示
- 底部按鈕文字為「切換角色」（非「登出」），點擊後清除角色並導航至 `/`

### 設計理由
- **依教學使用個案重排為 3 個 flow section**：① 出診斷題 → ② 派題給班級 → ③ 看診斷結果。Section 標題前帶圓圈數字，老師一眼看出時序。
- **D2 動態收斂（軟引導）**：所有項目仍可點，但每個 flow section 顯示真實狀態 chip（如 `3 份題組` / `尚未派題` / `可查看`），由 `useTeacherStageStatus()` 派生；`nextStep` 階段加 pulsing dot + 「建議下一步」chip + section 光暈。**不真正 disable**——第一次使用者仍能瀏覽全系統、看到完整功能；空狀態頁（`<EmptyStateGuide>`）負責教學引導。
- **D7 AI 標記**：用到 LLM/RAGFlow 的項目以 `<AIBadge>`（紫色 ✨ + AI pill + hover tooltip 說明 AI 用途）標示。回應教授「sidebar 看不到哪裡有 AI」回饋。

---

## 2.1 AIBadge

### 檔案
`src/components/AIBadge.jsx`

### 功能
在側邊欄與功能入口標示「此功能由 AI 協助」。統一紫色（spec-07 §AI 色票），含 `auto_awesome` Material Symbol icon + `AI` pill + hover tooltip。

### Props
- `description?: string` — hover tooltip 一句話說明（如「出題輔助：RAGFlow 從教材檢索並建議題目」）
- `size?: 'sm' | 'xs'` — 預設 `'sm'`；`'xs'` 用在密集列表
- `showPill?: boolean` — 預設 `true`；是否顯示「AI」文字 pill

### 設計理由
- **紫色 = AI** 是業界慣例，避開既有藍/橘子主題色不衝突
- **icon + pill + tooltip 三件套**：icon 給快速辨識、pill 給非技術老師、tooltip 給「具體是哪種 AI」的好奇者

---

## 2.2 EmptyStateGuide

### 檔案
`src/components/EmptyStateGuide.jsx`

### 功能
為「使用個案還沒走到的功能」提供**有教學意圖的空狀態頁**。回應教授「未派題就讓老師看診斷結果會困惑」需求——點進去不是空白，而是「告訴老師接下來會看到什麼 + 該做哪一步」。

### Props
- `icon?: string` — Material symbol 名稱（預設 `'info'`）
- `title: string` — 簡短標題
- `description: string` — 為何此處目前為空的說明（支援 `\n` 換行）
- `preview?: string[]` — bullet 列出「資料齊全後這裡會看到什麼」
- `primaryAction?: { label, to }` — 主要 CTA（綠色），通常是「跳回上一步」
- `secondaryAction?: { label, to | onClick }` — 次要 CTA（白底灰邊）

### 使用場景
- DashboardLayout：無題組 → 引導去 ① 出診斷題；有題組無派題 → 引導去 ② 派題

---

## 2.3 NodeBadge（D5 強化版）

### 檔案
`src/components/NodeBadge.jsx`

### 功能
知識節點識別徽章。子主題 A（INe-Ⅱ-3-*）藍系、子主題 B（INe-Ⅲ-5-*）橘系。預設顯示短編號（去掉 `INe-` 前綴），完整 ID + 名稱在 `title` tooltip。

### Props
- `nodeId: string` — 完整節點 ID
- `name?: string` — 節點名稱（hover tooltip 用）
- `size?: 'sm' | 'md' | 'lg'` — 預設 `'md'`
- `showFullId?: boolean` — 預設 `false`
- `className?: string`

### D5 視覺強化
- 左側 **color stripe** 強化辨識（3/4/5px 隨 size 變寬），不只靠文字色
- 字體放大、`min-width` 加寬，回應「字體或圖標弄大」回饋
- 整體採 inline-flex 容器 + 內部色帶 + 文字段，避免擠壓

---

## 2.5 DashboardLayout

### 檔案
`src/pages/teacher/dashboard/DashboardLayout.jsx`

### 功能
- 為 `/teacher/dashboard/*` 五個子分頁提供共用容器
- 顯示頁面標題、題組選擇器、5 個子分頁 tab 列
- 從 URL `?quizId=` 解析題組，並透過 `<Outlet context>` 傳遞 `{ quizId, overviewData, classes, assignments, quizzes }` 給子頁
- 包覆 `TeacherLayout` 作為外層佈局

### Props
無（透過 `<Outlet />` 渲染子頁）

### 子頁透過 `useOutletContext()` 取得的資料
| 欄位 | 型別 | 說明 |
|------|------|------|
| `quizId` | `string \| null` | 目前選定的題組 ID（已驗證為已派發） |
| `overviewData` | `object \| null` | `computeOverviewForQuiz(quizId, classes, assignments)` 的回傳值（含 `classStats`、`nodePassRates`、`topMisconceptions`） |
| `classes` | `Array` | 班級清單（從 `AppContext`） |
| `assignments` | `Array` | 派題清單（從 `AppContext`） |
| `quizzes` | `Array` | 題組清單（從 `AppContext`） |

### 視覺規格
- Tab 列為單列圓角白底容器（`rounded-2xl border border-[#BDC3C7] p-1`），內含 5 個 NavLink；當前頁 tab 以 `bg-[#C8EAAE] border-[#8FC87A]` 高亮
- 標題列右側為下拉式題組選擇器（沿用 spec-07 表單元件樣式）

---

## 3. StepIndicator

### 檔案
`src/components/StepIndicator.jsx`

### 功能
- 顯示多步驟流程的當前進度
- 已完成步驟顯示 ✓ 勾選圖示
- 當前步驟以主色調高亮
- 未到達步驟以灰色顯示

### Props
| Prop | 型別 | 必填 | 說明 |
|------|------|------|------|
| `steps` | `string[]` | 是 | 各步驟的標籤文字 |
| `currentStep` | `number` | 是 | 當前步驟編號（1-based，如第一步 = 1） |

### 使用場景
- `QuizCreateWizard` — 出題精靈的步驟一/步驟二切換

---

## 4. InfoButton

### 檔案
`src/components/InfoButton.jsx`

### 功能
- 圓形的 "i" 圖示按鈕
- 點擊後觸發 `InfoDrawer` 開啟
- 用於圖表或數據旁邊，提供資料來源/計算方式說明

### Props
| Prop | 型別 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `onClick` | `function` | 是 | — | 點擊時的回呼函式 |
| `className` | `string` | 否 | `''` | 額外的 CSS class |

### 視覺規格
- 圓形按鈕，直徑 28px（`w-7 h-7`）
- 白色背景 + 灰色邊框（`bg-white border-[#BDC3C7]`）
- SVG "i" 圖示居中
- hover 時邊框變綠色、背景變淺綠（`hover:border-[#8FC87A] hover:bg-[#EEF5E6]`）

---

## 5. InfoDrawer

### 檔案
`src/components/InfoDrawer.jsx`

### 功能
- 從右側滑入的面板
- 顯示資料計算方式、診斷邏輯、可信度說明等
- 支援多個可配置的區塊

### Props
| Prop | 型別 | 必填 | 說明 |
|------|------|------|------|
| `isOpen` | `boolean` | 是 | 控制面板開啟/關閉 |
| `onClose` | `function` | 是 | 關閉時的回呼函式 |
| `config` | `object` | 是 | 面板內容配置（見下方） |
| `dynamicStatus` | `string` | 否 | 動態覆寫 `currentStatus` 區塊的文字內容 |

### Config 結構
```javascript
{
  id: string,             // 設定 ID
  title: string,          // 面板標題
  dataReliability: 'real' | 'mock' | 'partial' | 'rule',  // 資料可信度等級
  sections: [
    {
      type: 'calculation' | 'diagnosis' | 'currentStatus' | 'theory' | 'references',
      title: string,       // 區塊標題（選填，預設使用 type 對應的 label）
      content: string,     // 區塊內容（適用於 calculation/diagnosis/currentStatus/theory）
      items: string[],     // 參考來源列表（僅 references 類型使用，取代 content）
    }
  ]
}
```

**注意**: `references` 類型使用 `items`（字串陣列）而非 `content`。

### 資料可信度徽章 (dataReliability)
| 值 | 顯示文字 | 背景色 | 是否顯示警告圖示 |
|----|----------|--------|------------------|
| `real` | 真實計算數據 | #C8EAAE (綠) | 否 |
| `mock` | 展示用模擬數據 | #FAC8CC (紅) | 是 |
| `partial` | 部分計算數據 | #FCF0C2 (黃) | 否 |
| `rule` | 規則式診斷引擎 | #BADDF4 (藍) | 否 |

### 視覺規格
- 寬度 460px（`w-[460px]`）
- Header 區域為深綠色背景（`bg-[#3D5A3E]`），白色文字
- 可捲動內容區為白色背景
- Footer 區域為淺灰綠色背景（`bg-[#F9FBF7]`）
- 頂部有關閉按鈕（圓形半透明白色）
- 開啟/關閉有 `translate-x` 滑動動畫（300ms）
- 背景遮罩（`bg-black/30`）
- 支援 Escape 鍵關閉

### 資料來源
面板內容配置定義於 `src/data/chartInfoConfig.js`，包含：
- 資料可信度等級標記
- 各圖表的計算方式說明
- 診斷方法論解釋
- 學術參考來源列表

---

## 6. KnowledgeSkillTree

### 檔案
`src/components/teacher/KnowledgeSkillTree.jsx`

### 功能
知識路徑技能樹（深木紋夜晚地圖風 / Mockup J-1）。整合於 KnowledgeMap 頁面 A 區，取代舊版色塊路徑。

> **資料驅動（2026-06-05 起）**：本元件不再寫死 12 節點，改由 `src/utils/skillTreeLayout.js` 的 `computeSkillTreeLayout(nodes)` 依傳入節點自動排版，任何單元都能渲染。

### 視覺特徵
- **深木紋背景**：`radial-gradient(ellipse at center, #5A3E22 0%, #2E1F10 100%)` + 木框邊 `#8B5E3C` + inset shadow
- **六角節點**（flat-top hex, r=42）+ 雙層渲染：背後光暈（blur 6–8px）+ 銳利輪廓
- **階段欄位**：依「先備關係最長路徑深度」算欄（階段 1..N），虛線導引 + 標頭
- **群組（列）**：依大節點（`parentCode`/`parentName`；皆無時退用節點 ID 去末段前綴）分列，每組取一個色盤（`SKILL_TREE_PALETTES`，前兩個沿用 A 綠 / B 橘）；同組內依階段由淺入深
- **終點節點**（不是任何節點的先備）：金色填充 + `★ 終點` 標記 + 強化光暈
- **連線**：木紋淺色 `#C19A6B`、依 `prerequisites` 繪製

### Props
| Prop | 型別 | 說明 |
|------|------|------|
| `nodes` | `Node[]` | 要渲染的節點（含 `prerequisites` / `parentCode`）；未給則 fallback 全域 `knowledgeGraph` 水溶液節點 |
| `selectable` | `boolean` | 勾選模式（未勾黯淡、已勾發光 + ✓） |
| `selectedNodeIds` | `string[]` | 已勾選節點 ID |
| `onToggle` | `(id) => void` | 點擊節點切換勾選 |
| `title` | `string` | 自訂卡片標題 |

### 狀態
| 欄位 | 型別 | 說明 |
|------|------|------|
| `hovered` | `Node \| null` | hover 中的節點，顯示於卡片頂部「ID + 完整名稱」徽章 |

### 色彩來源
全部色票取自 `src/constants/theme.js`：
- `SKILL_TREE_PALETTES`（多群組色盤陣列，前兩個為 A 綠 / B 橘）、`SKILL_TREE_DARK`

### 使用場景
- `Step1Nodes`（出題精靈步驟二，勾選模式，傳入所選單元的節點）
- `Step2Edit`（出題精靈步驟三，唯讀檢視已選節點）
- `KnowledgeMap` / `CustomKnowledgeMap`（未傳 nodes，fallback 全域水溶液圖）

---

## 7. AIFollowUpPanel

### 檔案
`src/pages/student/followUp/AIFollowUpPanel.jsx`

### 功能
第二層 AI 開放式追問的底部互動面板，整合：
- 題目回顧（摺疊 details，顯示題幹與學生先前的選項）
- 輪次標示（「對話 X/3・說說你的想法」）
- 多行 textarea 輸入框（Enter 送出、Shift+Enter 換行）
- 送出按鈕（內容為空或 disabled 時禁用）

### Props
| Prop | 型別 | 說明 |
|------|------|------|
| `inputValue` | `string` | textarea 受控值 |
| `onChange(value)` | `(string) => void` | 輸入變更 callback |
| `onSend()` | `() => void` | 送出 callback |
| `disabled` | `boolean` | 是否禁用（思考中或等待後端時） |
| `round` | `number` | 當前輪次（1-3） |
| `totalRounds` | `number` | 總輪次（預設 3） |
| `questionRecap` | `{stem, selectedContent} \| null` | 題目回顧內容；null 不顯示 |

### 配套引擎
`src/pages/student/followUp/followUpEngine.js`

純函式追問引擎（目前為前端模擬，未來接 LLM 後僅替換內部）。對外 API：
- `buildRound1Message(option, isCorrect): string` 產生第一輪開場提問
- `processStudentReply(ctx, reply): { kind: 'next' | 'final', aiMessage?, strategy?, finalDiagnosis? }`

`ctx` 結構：`{ round, strategy, isCorrect, misconceptionId, knowledgeNodeId, questionId, selectedOption, conversationLog }`

### 視覺規格
- 沿用 spec-07 § 木框米紙風格（外層由 StudentQuiz 的 `BottomPanel` 包裹）
- textarea 邊框 `#C19A6B`，focus ring `#5C8A2E`
- 送出按鈕為綠色木質風格

---

## 8. EditQuestionModal

### 檔案
`src/components/teacher/quizEditor/EditQuestionModal.jsx`

### 功能
- 出題精靈步驟二的單題編輯 modal
- 編輯題幹（stem）、知識節點、4 個選項的 content 與 diagnosis
- 整合 N6 干擾選項建議（`DistractorSuggestPopover`，spec-12 §7）
- **AI 潤飾題幹**：題幹標籤旁的「AI 潤飾題幹」按鈕，呼叫 `usePolishStem()` mutation（`POST /api/adaptive/polish-stem`），將 LLM 潤飾後的題幹回填至 textarea；題幹為空或 mutation pending 時 disabled
- **AI 建議選項**：選項區段標籤旁的「AI 建議選項」按鈕，呼叫 `useSuggestOptions()` mutation（`POST /api/adaptive/suggest-options`），將 LLM 建議的選項回填至各選項欄位；題幹為空或 mutation pending 時 disabled

### 使用場景
- `Step2Edit`（出題精靈步驟二）

### 資料來源
- React Query hooks：`usePolishStem`、`useSuggestOptions`（來自 `src/hooks/useAdaptive.js`）

---

## 9. AssignPopover

### 檔案
`src/pages/teacher/AssignmentMatrixParts.jsx`（`AssignPopover` 子元件）

### 功能
- 點擊派題矩陣未派發格子時顯示的確認 popover
- 設定截止日期
- **派發模式選擇器**：兩個 toggle 按鈕——「診斷模式」與「複習模式」，各附簡短說明文字
  - 診斷模式：用於首次診斷學生是否持有迷思概念
  - 複習模式：用於已完成診斷後的再次練習
- `onConfirm` 回傳 `(dueDate, dispatchMode)`，其中 `dispatchMode` 為 `'diagnosis' | 'review'`

### 使用場景
- `AssignmentManagement`（§2.6 診斷派題）

---

## 10. QuestionErrorRateChart

### 檔案
`src/pages/teacher/dashboard/shared/QuestionErrorRateChart.jsx`

### 功能
- 單班級診斷結果的各題錯誤率水平長條圖
- 以 Recharts `BarChart` + `layout="vertical"` 呈現
- 每題一列，X 軸為 0–100% 錯誤率
- 平均錯誤率以紅色虛線標示，並於頂部標籤顯示數值
- 自訂 Tooltip 顯示題幹、知識節點名稱、錯誤率、top misconception 標籤

### Props
| Prop | 型別 | 必填 | 說明 |
|------|------|------|------|
| `quizId` | `string` | 是 | 題組 ID |
| `classId` | `string` | 是 | 班級 ID |
| `totalStudents` | `number` | 是 | 班級學生總數 |

### 色彩編碼（錯誤率）
| 錯誤率範圍 | 顏色 | 含義 |
|---------|------|------|
| ≥ 50% | #F28B95（紅） | 高錯誤率 |
| 30–49% | #F4D03F（黃） | 中等錯誤率 |
| < 30% | #A7D696（綠） | 低錯誤率 |

### 圖表說明文字
- 標題：「各題錯誤率」
- 副標：「全班各題的答錯比例，紅色虛線為班級平均錯誤率（**N**%）」
- 圖例：三個色標行「高錯誤率（≥50%）」、「中等錯誤率（30–49%）」、「低錯誤率（<30%）」

### 資料來源
- `useQuiz(quizId)` — 取得題組與題目定義
- `useQuizStats(quizId, classId)` — 取得統計資料
- `buildQuestionStats()` — 輔助函式，將統計資料轉換為各題的選項計數

### 使用場景
- `SingleClassReport`（診斷報告中的一部分，位於 `HeatmapView` 之前）

---
