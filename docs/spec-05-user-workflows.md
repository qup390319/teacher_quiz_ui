# SPEC-05: User Workflows / 使用者操作流程規格

## 1. 教師端工作流程

### 1.1 核心三步驟流程

教師端主頁（TeacherDashboard）呈現三步驟工作流程總覽：

```
步驟一：出題管理
    → 點擊後導航至 /teacher/quizzes（考卷庫）
    → 從考卷庫可進入 /teacher/quiz/create（出題精靈）
    → 也可從主頁 CTA「快速出題」直接進入 /teacher/quiz/create
    → 或使用「一鍵使用推薦題組」直接跳至 /teacher/quiz/create?step=2

步驟二：派題管理
    → /teacher/assignments
    → 選擇考卷 + 班級 + 截止日期
    → 建立派題記錄

步驟三：診斷結果
    → /teacher/dashboard（DashboardReport）
    → 篩選班級 / 考卷
    → 檢視圖表與分析
```

### 1.2 出題流程 (Quiz Creation)

```
教師進入 /teacher/quiz/create
    │
    ├─ 步驟一：選擇知識節點 (Step1Nodes)
    │   ├─ 瀏覽 8 個知識節點（按 level 分組）
    │   ├─ 勾選/取消勾選節點
    │   ├─ 選定的 ID 儲存至 selectedNodeIds
    │   └─ 點擊「下一步」
    │
    └─ 步驟二：編輯題目 (Step2Edit)
        ├─ 系統根據選定節點載入對應預設題目
        ├─ 可編輯題幹 (stem)
        ├─ 可編輯各選項內容 (content)
        ├─ 可調整各選項的迷思對應 (diagnosis)
        ├─ 點擊「儲存」→ 呼叫 saveQuiz()
        └─ 儲存成功後導航至考卷庫
```

### 1.3 派題流程 (Assignment)

```
教師進入 /teacher/assignments
    │
    ├─ 以矩陣/網格 UI 呈現（考卷為列 × 班級為欄）
    │   ├─ 每格顯示：完成率%、已繳交/總人數、截止日期
    │   ├─ 已派發格子依完成率顯示不同顏色：
    │   │   ├─ 100% → 綠色 (#C8EAAE)，狀態文字「已完成」
    │   │   ├─ 1~99% → 黃色 (#FCF0C2)，狀態文字「進行中」
    │   │   └─ 0% → 淺綠 (#EEF5E6)，狀態文字「待作答」
    │   └─ 未派發格子顯示虛線框 + 「派發」按鈕
    │
    ├─ 點擊未派發格子 → 彈出 Popover
    │   ├─ 設定截止日期
    │   ├─ 確認派發 → 呼叫 addAssignment()
    │   └─ 自動生成 ID: assign-{timestamp}
    │
    └─ 點擊已派發格子 → 彈出 Popover
        ├─ 可修改截止日期 → 呼叫 updateAssignment()
        └─ 可取消派題 → 呼叫 removeAssignment()
```

### 1.4 診斷結果查看流程

```
教師進入 /teacher/dashboard
    │
    ├─ 選擇考卷（下拉選單）
    ├─ 選擇班級（下拉選單，可選「全部班級」）
    │
    ├─ 檢視概念掌握長條圖
    │   ├─ X 軸：知識節點名稱
    │   ├─ Y 軸：通過率 (%)
    │   └─ InfoButton → 資料說明面板
    │
    ├─ 檢視迷思概念分佈
    │   ├─ 各迷思概念的學生人數
    │   └─ 可展開查看持有該迷思的學生名單
    │
    ├─ 檢視散佈圖
    │   ├─ X 軸：完成率
    │   ├─ Y 軸：正確率
    │   └─ 各班級以不同顏色表示
    │
    └─ 檢視各題選項分佈
        ├─ 每題顯示 A/B/C/D 選項的選答人數
        └─ 正確選項以綠色標示
```

### 1.5 班級管理流程

```
教師進入 /teacher/classes
    │
    ├─ 瀏覽所有班級卡片
    │   └─ 顯示：班級名稱、年級、科目、學生人數
    │
    └─ 點擊班級 → /teacher/classes/:classId
        ├─ 檢視學生名冊（姓名 + 座號）
        ├─ 可新增學生
        ├─ 可移除學生
        └─ 呼叫 updateClassStudents() 儲存變更
```

### 1.6 知識地圖查看流程

```
教師進入 /teacher/knowledge-map
    │
    ├─ 以層級結構展示知識節點
    │   ├─ Level 1: 基礎概念（傳導、對流液/氣）
    │   ├─ Level 2: 進階概念（輻射原理、輻射阻擋）
    │   ├─ Level 3: 應用概念（保溫、散熱）
    │   └─ Level 4: 綜合應用（節能設計）
    │
    ├─ 每個節點卡片顯示
    │   ├─ 名稱 + 描述
    │   ├─ 迷思概念列表（id + label）
    │   ├─ 教學策略建議
    │   └─ 先備知識連結
    │
    └─ 節點間以線條/箭頭表示先備關係
```

---

## 2. 學生端工作流程

### 2.1 完整作答流程

作答流程分為三個階段（Phase）：`intro` → `question` → `confirming` → `done`

```
學生從首頁選擇「學生端」
    │
    ├─ 進入 /student (StudentHome)
    │   ├─ 瀏覽可作答的已發佈考卷列表
    │   ├─ 檢視歷史作答記錄
    │   └─ 點擊考卷 → 進入作答
    │
    ├─ 進入 /student/quiz/:quizId (StudentQuiz)
    │   │
    │   ├─ Phase: intro
    │   │   ├─ 逐條顯示 3 則歡迎訊息（SystemBubble）
    │   │   └─ 完成後自動進入 question phase
    │   │
    │   ├─ Phase: question（逐題作答，無即時對錯回饋）
    │   │   ├─ SystemBubble 顯示知識節點名稱 + 題號
    │   │   ├─ SystemBubble 顯示題幹
    │   │   ├─ 學生選擇選項（底部面板顯示 4 個選項按鈕）
    │   │   ├─ StudentBubble 顯示學生選擇的選項內容
    │   │   ├─ 呼叫 recordAnswer(q.id, opt.tag, opt.diagnosis)
    │   │   ├─ **不顯示對錯回饋**，直接進入下一題
    │   │   └─ 最後一題完成後 → 進入 confirming phase
    │   │
    │   ├─ Phase: confirming（批次迷思確認）
    │   │   ├─ 收集所有不重複的迷思概念 ID（diagnosis !== 'CORRECT'）
    │   │   ├─ 若無迷思概念 → 直接進入 done phase
    │   │   ├─ 若有迷思概念 → 逐一確認：
    │   │   │   ├─ SystemBubble：「我想再確認一件事，看看我有沒有理解錯你的想法。」
    │   │   │   ├─ SystemBubble：顯示 confirmQuestion
    │   │   │   ├─ 底部面板顯示兩個按鈕：
    │   │   │   │   ├─ 「對，我是這樣想的」→ 保留迷思診斷
    │   │   │   │   └─ 「不，我不這樣認為」→ removeMisconception(id) 改為 CORRECT
    │   │   │   └─ 進入下一個迷思確認（或結束）
    │   │   └─ 所有確認完成 → 進入 done phase
    │   │
    │   └─ Phase: done
    │       ├─ 顯示完成訊息
    │       ├─ addToHistory(record) 記錄至歷史
    │       └─ 自動導航至 /student/report（延遲 1800ms）
    │
    └─ 進入 /student/report (StudentReport)
        ├─ 顯示正確率統計
        ├─ 列出被診斷的迷思概念
        │   ├─ 迷思標籤 (label)
        │   ├─ 學生端說明 (studentDetail)
        │   └─ 學習提示 (studentHint)
        └─ 返回首頁按鈕
```

### 2.2 迷思概念診斷機制

診斷流程為兩階段制，兩階段分開執行：

**第一階段：作答自動診斷（question phase 中）**
- 每題作答時，根據選項的 `diagnosis` 欄位即時記錄：
  - `'CORRECT'` → 記錄為正確
  - 迷思概念 ID（如 `'M02-1'`）→ 記錄為該迷思概念
- 此階段**不給予任何對錯回饋**，學生不知道自己答對或答錯
- 所有題目作答完成後，才進入第二階段

**第二階段：批次迷思確認（confirming phase）**
- 從所有作答記錄中收集不重複的迷思概念 ID
- 逐一向學生展示 `confirmQuestion`（確認問題）
- 學生可選擇：
  - **「對，我是這樣想的」**→ 保留迷思診斷記錄
  - **「不，我不這樣認為」**→ 呼叫 `removeMisconception(misconceptionId)` 將相關作答的 diagnosis 改為 `'CORRECT'`
- **注意**: `studentDetail` 和 `studentHint` 不在此階段顯示，僅在最終的 StudentReport 頁面中呈現

---

## 3. 跨角色交互

```
教師 → 建立考卷 (saveQuiz)
         ↓
教師 → 派發考卷 (addAssignment)
         ↓
學生 → 作答考卷 (recordAnswer)
         ↓
教師 → 檢視診斷結果 (getClassAnswers, getNodePassRates, etc.)
```

**注意**: 目前為純前端原型，教師與學生的資料不互通。
- 教師端的診斷結果來自 Mock 資料（`ANSWER_DISTRIBUTIONS_MAP`）
- 學生端的作答結果存於前端 state，不會反映到教師端儀表板
- 未來接上後端後，學生作答資料將即時反映至教師端
