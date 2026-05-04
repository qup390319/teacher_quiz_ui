# 規格偏離記錄 (Spec Deviations Log)

> 當實作中發現 spec 有矛盾或不可行之處，記錄在此。
> 每筆記錄包含：日期、涉及的 spec、問題描述、替代方案、是否已同步更新 spec。

---

## 格式

```
### [日期] 偏離標題
- **涉及 Spec**: spec-XX §Y.Z
- **問題**: 描述矛盾或不可行之處
- **替代方案**: 你採用的做法
- **Spec 已更新**: ✅ / ❌
```

---

### [2026-04-28] Demo 單元由「溫度與熱」全面切換為「水溶液」
- **涉及 Spec**: spec-01 §6、spec-04 §1.1 / §2.2 / §2.3 / §2.5、spec-05 §2.2、CLAUDE.md「領域知識速查」
- **問題**: 研究方向調整，原本國中三年級「溫度與熱」demo 不再符合新研究對象（國小高年級學童），需全面替換 demo 內容。
- **替代方案**: 依《功能修改文件_demo單元切換水溶液_v1》執行：
  1. 知識節點：8 個（INa-Ⅲ-8-*）→ 12 個（INe-II-3-* 五個 + INe-Ⅲ-5-* 七個）
  2. 迷思概念：每節點固定 4 條，總計 48 條（編號 M01-* ~ M12-*）
  3. 兩份示範考卷：標題改為「水溶液 · 迷思診斷（第一/二次）」，皆涵蓋同組 5 個節點（INe-II-3-02、03、05；INe-Ⅲ-5-4、7）
  4. 班級年級：三年級 → 五年級（甲/乙/丙班，學生人數與名單不變）
  5. 模擬作答分佈：沿用各班相對表現樣態（甲班中等、乙班略低、丙班最低、第二次施測甲班進步），僅選項對應的迷思 ID 隨新題目改變
- **同步更新項目**:
  - 程式：`knowledgeGraph.js`、`quizData.js`、`classData.js`、`AppContext.jsx`、`chartInfoConfig.js` 及 9 個頁面元件
  - 路徑圖：`KnowledgeMap.jsx` 與 `Step1Nodes.jsx` 由原本「單一線性 5 段」重構為「子主題 A 與 B 各一條」雙路徑佈局
- **Spec 已更新**: ✅（spec-01、spec-04、spec-05、CLAUDE.md 已同步）
- **未動到的歷史文件**: `docs/功能修改文件_迷思成因診斷強化_v1.md` 為早期功能設計提案，內含大量「熱傳導」相關範例，因屬歷史性提案文件且尚未實作，本次不變動，未來該功能落地時再隨之更新範例。
- **舊單元資料**: 完全替換，未保留。需要回切時請從 git 歷史還原（commit 34cd0aa 之前為「溫度與熱」狀態）。

---

### [2026-04-30] 第二層改為 AI 開放式追問（取代封閉式迷思確認）
- **涉及 Spec**: spec-05 §2.1 / §2.2、spec-04 §2.7（HistoryRecord）、spec-03 §1 / §6
- **問題**: 依《雙層次迷思概念診斷系統_功能規格文件》（外部規劃文件），原系統「答錯題目 → 是/否封閉確認」改為「所有題目 → AI 開放式追問 1-3 輪」。但兩個外部前提需要適配：
  1. 外部規格示例為「溫度與熱（國中）」，本專案 demo 為「水溶液（國小五年級）」
  2. 規格描述真實 LLM 動態生成；本專案目前為純前端原型（`VITE_BACKEND_URL` 未接）
- **替代方案**:
  1. **單元適配**：第二層所有追問模板（情境引導、對比情境、二選一、遷移測試、探究來源）改寫為 5 個示範考卷涵蓋的水溶液節點（INe-II-3-02、03、05；INe-Ⅲ-5-4、7）；語氣由「同學」改為「老師想⋯」適合國小生。
  2. **AI 模擬引擎**：實作 `src/pages/student/followUp/followUpEngine.js` 純函式模組，以「文字長度＋模糊關鍵詞＋知識節點正確概念關鍵詞」啟發式判讀對應四種情境（A 模糊 / B 錯誤推理 / C 正確完整 / D 答對但理由錯），對外 API 模仿 LLM 呼叫介面（`processStudentReply(ctx, reply) → { kind, aiMessage?, finalDiagnosis? }`），未來接後端 LLM 時僅替換引擎內部，不影響 StudentQuiz 與 spec 結構。
  3. **狀態變更自動化**：`statusChange.changeType` 為 UPGRADED 時自動呼叫 `removeMisconception()`、為 DOWNGRADED 時將 diagnosis 改為 `misconceptionCode`；`DISCOVERED` 暫保留欄位但未實作（外部規格場景較稀有）。
  4. **程式拆檔**：StudentQuiz.jsx 為避免超過 500 行限制，將 `BottomPanel / OptionsPanel / DonePanel` 抽至 `studentQuizPanels.jsx`。
- **同步更新項目**:
  - 程式：新增 `src/pages/student/followUp/{followUpEngine.js, AIFollowUpPanel.jsx}`、`src/pages/student/studentQuizPanels.jsx`；改寫 `StudentQuiz.jsx`（移除 `confirming` phase）；`StudentReport.jsx` 新增「對話中你提到」引用區與「答對了，但可以更深入理解」黃色區塊
  - Spec：spec-05 §2.1 phase 流程從 4 段改為 4 段（confirming → followUp）、§2.2 重寫診斷機制；spec-04 §2.7 HistoryRecord 增 `followUpResults` 欄位、新增 §2.7.1 FollowUpResult；spec-03 §1 元件總覽加入 AIFollowUpPanel、§6 新章節
- **未動到的項目**:
  - `removeMisconception()` 仍保留於 AppContext，由追問引擎 UPGRADED 結果自動觸發
  - `confirmQuestion` 欄位仍保留於 `knowledgeGraph.misconceptions`，雖不再於診斷流程中使用，但作為迷思的人類可讀描述仍有保留價值
- **Spec 已更新**: ✅（spec-03、spec-04、spec-05 均已同步）

---

### [2026-05-03] 派題管理頁空白 + 學生端 500 + 學生無法載入考卷（系統巡檢）
- **涉及 Spec**: spec-04 §1.4（ClassBrief vs ClassDetail）、spec-10 §6.5（assignments 端點 stats 欄位）、spec-13 §6（quizzes / scenarios 學生白名單）
- **問題（同時揭露 4 個 bug）**:
  1. `AssignmentManagement.jsx:410` 讀 `cls.students.length`，但 `GET /api/classes` 只回 `studentCount` → 整頁 throw、空白。
  2. 後端 `assignments.list_assignments` 學生分支寫 `student = user.student`（async lazy load 未綁 selectinload）→ 學生端 `/api/assignments` 一律 500。
  3. `/api/quizzes/{id}`、`/api/scenarios/{id}`（含列表）原本掛 `require_teacher`，學生端 StudentQuiz / ScenarioChat / StudentHome 全打不到 → 任務看不見、點開 403。
  4. `StudentHome.jsx` 仍在 destructure P4 已從 AppContext 移除的 `treatmentSessions`，accessing `treatmentSessions[key]` 會在未來 DB 接通後爆 TypeError。
  5. ESLint 545 errors 多為 `.claude/worktrees/*/dist/*` 內的 minified 檔案被掃進去（globalIgnores 沒包含）。真實源碼錯誤只有 2（TeacherReport 在 render 內宣告 component；QuizCreateWizard 在 effect 內 setState）。
- **替代方案**:
  1. 前端把 `cls.students.length` 改為 `cls.studentCount`（與 `ClassBrief` schema 對齊）。
  2. 後端 `list_assignments` 改用 `await db.get(Student, user.id)` 顯式查 Student；新增 `_build_stats()` 服務一次抓所有相關 assignment 的 `submitted / total / completionRate`，schema `AssignmentIO` 補三個 camelCase 欄位（`completionRate / submittedCount / totalStudents`）。
  3. `/api/quizzes` 與 `/api/scenarios` 列表 + 詳情都改用 `get_current_user`：teacher 看全部；student 限定「自己班級已被派發的 quiz/scenario」（透過 Assignment 表 join 過濾）。
  4. `StudentHome.jsx` 移除 `treatmentSessions` destructure，scenario 完成度暫以 `assignment.status === 'completed'` 推斷；真正完成判定待後續整合 `useTreatmentSessionByKey`。
  5. `eslint.config.js` 的 `globalIgnores` 加入 `.claude/worktrees/**` 與 `backend/**`；TeacherReport 的 inline `CustomTooltip` 拉出檔案頂層改名為 `BreakdownTooltip`；QuizCreateWizard 的 `useEffect → setCurrentStep` 改為在 `useState` 初值階段直接讀取 `searchParams`。
- **同步更新項目**:
  - 程式：`backend/app/routers/assignments.py`、`backend/app/routers/quizzes.py`、`backend/app/routers/scenarios.py`、`backend/app/schemas/assignment.py`、`src/pages/teacher/AssignmentManagement.jsx`、`src/pages/student/StudentHome.jsx`、`src/pages/teacher/TeacherReport.jsx`、`src/pages/teacher/quiz/QuizCreateWizard.jsx`、`eslint.config.js`、`src/pages/student/ScenarioChat.jsx`（補回 hydrate effect 的 eslint-disable 並註明 server-hydration 用途）
  - Spec：spec-04 §1.4 補 ClassBrief vs ClassDetail、§2.x 補 Assignment 統計欄位；spec-10 §6.5 文件 stats 計算規則；spec-13 §6 對學生開放的端點白名單。
- **驗證**:
  - `npm run lint` ✅ 0 errors, 0 warnings
  - `npm run build` ✅ 5.0s 成功
  - 教師端 `/teacher/assignments/diagnosis` 渲染並顯示 100% / 20/20 等統計（screenshot 已比對）
  - 學生端 `/student` 顯示 5 筆任務（標題、題數、截止日皆正確）
- **Spec 已更新**: ✅（spec-04、spec-10、spec-13 已同步）
