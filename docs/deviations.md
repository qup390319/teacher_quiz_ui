# 規格偏離記錄 (Spec Deviations Log)

> 當實作中發現 spec 有矛盾或不可行之處，記錄在此。
> 每筆記錄包含：日期、涉及的 spec、問題描述、替代方案、是否已同步更新 spec。

---

### [2026-06-04] 知識節點完整階層收進版控（migration 0027 快照 upsert）

- **涉及 Spec**: `docs/spec-11-database-schema.md` §3.20（parent_nodes / knowledge_nodes 資料來源）
- **背景**: 完整課綱階層（39 次主題 + 201 大節點 + 404 小節點 + 48 迷思 + 36 綁定）原本只透過 runtime「Word 匯入」+ ad-hoc SQL 建在 DB 裡、**不在版控**，所以 `git push + alembic upgrade` 部署不會帶這份資料——各環境各自匯入、彼此不一致（部署後發現 production 只有 35 個次主題、缺 `aa/bc/jb/me`、畫布/去重都沒有）。
- **處置（migration 0027，使用者 2026-06-04 選「快照 migration」）**:
  - 把本地當前完整階層匯出為快照 `backend/alembic/versions/data/0027_knowledge_hierarchy.json`（commit 進 repo，約 309 KB；排除 created_at/updated_at）。
  - migration 0027 用 SQLAlchemy `on_conflict_do_update`（**upsert**）依外鍵相依順序（units→parent_nodes→knowledge_nodes→misconceptions→unit_parent_nodes）載入，作為最後一支。
  - **upsert 而非 insert**：不論前面 0014/0022/0024/0025/0026 對這些列做了什麼，最終狀態都被強制覆蓋成快照 → fresh 與既有 DB 皆得一致結果，且冪等。
  - **只新增/更新、不刪除快照外的列**：避免誤刪被題組引用的節點（prod 題組僅引用 5 個 demo 節點，皆在快照內）。
  - downgrade 為 no-op（資料快照無法乾淨還原；需回復改用部署前 pg_dump 全量備份）。
- **後續維護**: 之後若在本地再匯入/調整課綱，需**重新產生快照 JSON 並新增 0028**（snapshot migration 的本質——資料變更要出新版）。
- **驗證**: 本地套用 0027（既有資料→no-op upsert，counts 不變）；受控測試竄改 2 筆名稱 + 刪 1 筆節點 → downgrade 0026 → upgrade head → 名稱還原（UPDATE 路徑）、節點與迷思重新插回（INSERT 路徑）✅；ruff + py_compile 通過。
- **Spec 已更新**: ✅（spec-11 §3.20；本筆 deviations）

---

### [2026-06-04] `line-clamp-*` 多行截斷修正：Tailwind v4 cascade-layer 順序衝突

- **涉及 Spec**: `docs/spec-07-ui-design-system.md` §6.5（新增）
- **問題描述**: 全專案多處用 `line-clamp-N`（單元簡介、大/小節點名稱、迷思 label、匯入預覽等）做多行截斷。瀏覽器實測（dev server 注入長字串量測 `clientHeight`/`scrollHeight`）發現：
  - Tailwind v4 **有**正確產生 `.line-clamp-2 { display:-webkit-box; … }`，且**單獨**使用 `line-clamp-N` 時截斷正常運作（新版 Chromium 會把 computed `display` 序列化成 `flow-root`，截斷仍生效，但易在 devtools 被誤判為壞掉）。
  - 真正失效情境：元素**同時**有 `line-clamp-N` 與某個 display utility（`block` / `flex` / `grid` / `inline-*`）。Tailwind v4 把 display utility 排在 `.line-clamp-*` **之後**（同一 `@layer utilities`、同 specificity），`display:block/flex` 覆蓋 `-webkit-box` → 截斷靜默失效、長文字撐破版面。className 寫的順序不影響（勝負取決於產生的 CSS 順序）。
  - `CanvasNodeListPanel.jsx` 曾踩此雷，先前以 inline `-webkit-box` style 繞過。
- **替代方案 / 處置**: 在 `src/index.css` 以**未分層（unlayered）規則**重新定義 `.line-clamp-1`～`.line-clamp-6` + `.line-clamp-none`。依 CSS cascade layers 規範，未分層宣告優先於任何 `@layer` 內宣告，故能穩定贏過 display utility，讓全專案所有 `line-clamp-N` className 一次生效且面向未來、無需逐處改。同步移除 `CanvasNodeListPanel.jsx` 的 inline workaround，回歸統一 `className="… line-clamp-2"` 寫法。
- **限制**: 固定 class 選擇器，不涵蓋 responsive 變體（如 `md:line-clamp-2`）；目前專案未使用，已於 index.css 註解與 spec-07 §6.5 註明。
- **驗證**: `npm run build` + `npm run lint` 通過；dev server 實測 `line-clamp-2` / `line-clamp-2 block` / `line-clamp-2 flex` 三者皆 `clientHeight < scrollHeight`（截斷生效）。
- **Spec 已更新**: ✅（spec-07 §6.5；本筆 deviations）

---

### [2026-06-04] water-solution 12 知識節點所屬次主題補正（migration 0026）— 承 0025

- **涉及 Spec**: `docs/spec-11-database-schema.md` §3.20 parent_nodes / knowledge_nodes 雙軸模型
- **背景**: migration 0025 去重後，使用者於「知識節點 > 階層結構」三欄編輯器發現次主題 **Jb** 的大節點 `INe-Ⅱ-3` 顯示「沒有小節點」。根因：0025 只改了 12 個示範知識節點的 `parent_node_id`（指到正規次主題大節點 `pnode-jb-ine-ii-3` / `pnode-jd-ine-5`），但 `unit_id` 仍停在教學單元 `unit-water-solution`；而三欄編輯器第三欄[ThreeColumnEditor.jsx](../src/pages/admin/components/ThreeColumnEditor.jsx) 先以**次主題 unit_id** 抓知識節點再依大節點過濾，故 `unit_id≠次主題` 的節點不會出現 → **0025 只做了一半**。依雙軸模型 `knowledge_nodes.unit_id` 本應指向次主題（這 12 筆指向教學單元亦為 migration 0014 歷史遺留）。
- **安全性確認**: 後端無任何處硬編碼靠 `unit-water-solution` 抓這些節點（端點皆依當下 unitId 過濾）；教學單元「水溶液」對這些節點的關聯走 `unit_parent_nodes`（M:N，0025 已重指 canonical），搬 `unit_id` 不影響、單元列大節點標籤照常；示範題組／教師端為 Mock／前端、靠節點代碼不靠 unit_id。
- **處置（migration 0026，使用者 2026-06-04 選「修階層 + 退出畫布待重排」）**:
  - `parent_node_id=pnode-jb-ine-ii-3` 的 5 個（INe-Ⅱ-3-01~05）→ `unit_id=unit-jb`；`pnode-jd-ine-5` 的 7 個（INe-Ⅲ-5-1~7）→ `unit_id=unit-jd`。
  - 同時 `on_canvas=false` 並**清空 canvas 座標**（`bulk-set-canvas` 對既有座標會沿用，故必須清空才能於重加時走自動排版），避免與 Jd 既有 3 個畫布節點重疊。
  - selector 以 `parent_node_id` 鎖定 → 全新 DB（0025 已略過合併、節點仍指 legacy）上命中 0 列、安全 no-op。downgrade 還原 `unit_id=unit-water-solution` + `on_canvas=true`（座標走自動排版，best-effort）。
  - ⚠️ 踩雷：revision id 過長（`alembic_version` 為 `varchar(32)`），首版 id 35 字元 → `StringDataRightTruncationError`、交易整個回滾（資料未動）。已縮短為 `0026_relocate_water_kn`。
- **備份**: `backend/backups/pre_relocate_water_kn_20260604.sql`。
- **驗證**: 編輯器等價查詢確認 Jb→INe-Ⅱ-3→5 子節點、Jd→INe-Ⅲ-5→7 子節點；12 筆 `unit_id` 已正確、`on_canvas=false`、座標已清空；水溶液教學單元 `unit_parent_nodes` 綁定完好。
- **Spec 已更新**: ✅（spec-11 §3.20；本筆 deviations）

---

### [2026-06-03] 去重 water-solution 大節點（migration 0025）— **推翻本日稍早「合理共用」之認定**

- **涉及 Spec**: `docs/spec-11-database-schema.md` §3.20 `parent_nodes` / §3.21 `unit_parent_nodes`
- **背景**: 後台「管理大節點」modal 左欄出現「（未指派次主題）」分組，內含 `INe-Ⅱ-3`、`INe-Ⅲ-5`。盤查發現同一課綱代碼存在**兩份** `parent_node`：
  - legacy（migration 0014/0018 從原型 12 個水溶液知識節點升級）`pnode-water-solution-ine-3` / `-ine-5`，其 `unit_id` 指向**教學單元** `unit-water-solution`（`type='unit'`）。
  - canonical（runtime 課綱 Word 匯入建立、**不在任何 migration/seed**）`pnode-jb-ine-ii-3`（次主題 `unit-jb`）/ `pnode-jd-ine-5`（次主題 `unit-jd`），原本 0 引用（空殼）。
  - modal 左欄分組以 `subthemeById.get(parentNode.unitId)` 對應，legacy 的 `unit_id` 指到教學單元（非次主題）→ 對不到 → 落入「（未指派次主題）」。根因：`parent_nodes.unit_id` 依設計應指向**次主題**（§3.20），legacy 早於次主題概念、指到教學單元，屬語意錯誤。
- **與前一決定的衝突（必讀）**: 本日稍早〈資料一致性盤點〉(下方同日記錄) 第 31-33 點曾**刻意**：(a) 把 `unit-water-solution` 綁到 legacy `pnode-water-solution-ine-3/5`；(b) 認定「同 code 跨不同單元屬**合理共用**…非錯誤」而保留重複。**本筆推翻 (b) 對 `INe-Ⅱ-3` / `INe-Ⅲ-5` 的認定**：因該 pair 並非「跨兩個次主題的合理共用」，而是「legacy 掛在教學單元（非次主題）」的歷史誤建。經使用者 2026-06-03 明示「確保資料沒有重複」、並選擇「以官方課綱文件名稱為主」後執行去重。
- **替代方案 / 處置（migration 0025）**: 保留 canonical（官方課綱細目名稱 + 正確次主題歸屬），把 legacy 的所有引用重指到 canonical，再刪除 legacy：
  - `knowledge_nodes.parent_node_id` 12 筆（INe-Ⅱ-3-01~05 → `pnode-jb-ine-ii-3`；INe-Ⅲ-5-1~7 → `pnode-jd-ine-5`）+ 同步反正規化 `parent_name` 快取（`parent_code` 不變）。
  - `unit_parent_nodes.parent_node_id` 2 筆（`unit-water-solution` 的綁定改指 canonical；canonical 原 0 綁定，無 PK 衝突）。
  - 刪除 2 筆 legacy `parent_nodes`。`parent_nodes` 203→201。
  - **fresh-DB 防呆**：canonical 由 runtime 匯入、不在 migration 鏈中。upgrade 對每筆合併先檢查 canonical 是否存在，不存在（全新 DB 尚未匯入課綱、亦無重複）即略過，避免 FK 違規。
  - downgrade 可還原（重建 legacy + 引用指回，以 code 鎖定本批）。已實測 downgrade→upgrade 往返正確。
- **已知殘留 / 後續**: 課綱 docx 匯入本身仍可能對「既有知識節點已有的大節點」再建一份同 code 節點（本案重複的源頭）。根治需改匯入邏輯（匯入時偵測既有 parent_node 並複用），屬更大範圍，未在本次處理。
- **備份**: `backend/backups/pre_dedup_water_parent_nodes_20260603.sql`（全庫 pg_dump）。
- **驗證**: legacy 0 筆殘留、`INe-Ⅱ-3`/`INe-Ⅲ-5` 各 1 筆且均歸正確次主題、modal「未指派」不再含此 2 碼（`orphanMissing` 2→0）、12+2 引用已重指、`parent_name` 已同步、down/up 往返 ✅。
- **Spec 已更新**: ✅（spec-11 §3.20/§3.21；本筆 deviations）

---

### [2026-06-03] 知識節點頁移除「節點庫」分頁（四視圖 → 三視圖）
- **涉及 Spec**: `docs/spec-02-routes-and-pages.md` §3.8（KnowledgeNodesAdmin 視圖清單）
- **背景**: 使用者檢視 `/admin/knowledge-nodes` 工具列時，詢問「節點庫」與「未分配」兩個分頁是否仍有用途。盤點後確認兩者皆為功能性視圖，但「節點庫」與畫布視圖工具列的「加入節點」modal（`AddNodesToCanvasModal`）功能高度重疊——兩者都是從單元待加入池（`on_canvas=false`）挑節點上畫布。使用者決定只移除「節點庫」分頁、保留「未分配」（後者是唯一能批次指派 `unit_id IS NULL` 節點到單元的入口，無替代路徑）。
- **替代方案 / 影響**:
  - 「加入畫布」改由畫布視圖的「加入節點」modal 達成（功能等價）。
  - 「移回未分配」動作隨「節點庫」視圖一併移除；此動作目前無其他 UI 入口（使用者已知並接受）。若日後需要，可在畫布 node 控制或 modal 內補回。
- **同步更新項目**:
  - 程式：`src/pages/admin/KnowledgeNodesAdmin.jsx` — 移除 `VIEW_TABS` 的 `library` 項、刪除 `LibraryView` 元件（約 215 行）與其 render 區塊、移除未再使用的 `useBulkSetCanvas` import；`needLibrary` 與次主題下拉條件由 `(canvas || library)` 收斂為 `canvas`；`libraryNodes` 仍保留供畫布「加入節點」徽章與空畫布說明使用，並將 `refetchLibrary()` 接到 modal `onAdded` 讓徽章即時更新。
  - Spec：spec-02 §3.8 由「四個視圖」改寫為「三個視圖」、調整節點生命週期與工具列說明（下拉僅 canvas tab 顯示）。
- **驗證**: `npm run lint` ✅ / `npm run build` ✅ / Preview 手動確認三分頁切換正常、畫布「加入節點」徽章運作。
- **Spec 已更新**: ✅（spec-02）

---

### [2026-06-03] 資料一致性盤點：稽核 SQL 與實際 schema 落差 + 連帶清整

- **涉及 Spec**: `docs/spec-11-database-schema.md`（subthemes / parent_nodes / unit_parent_nodes 雙軸模型）、`docs/sop-knowledge-node-canvas-import.md` §4.3
- **背景**: 應使用者要求對知識節點做三大塊一致性盤點（階層 / 畫布 / 教學單元↔大節點）。原稽核 SQL 依舊版理解撰寫，與實際 schema 不符，揭露以下落差與待清整項目。
- **稽核 SQL 落差（重要，下次稽核請沿用正解）**:
  1. **無 `subthemes` 表**：次主題實際是 `units` 內 `type='subtheme'` 的列（39 筆）。
  2. **`parent_nodes` 無 `subtheme_id` 欄**：歸屬次主題用 `parent_nodes.unit_id`。
  3. **雙軸模型**：`knowledge_nodes.unit_id` 指向「次主題 unit」（舊直連）；`unit_parent_nodes` 則是「教學 unit（type='unit'）↔ 大節點」的 M:N 掛載（migration 0021/0022 新增）。兩者命名空間幾乎不交集——因此「kn 的 parent 是否掛在該 unit」這類稽核若混用兩軸會 100% 誤判（當時誤報 404/404）。正解：教學單元用 `unit_parent_nodes`、次主題結構用 `knowledge_nodes.unit_id` + `parent_nodes.unit_id`，**分開稽核、不可交叉比對**。
  4. `grade_band` 全為 `upper`；中/高年級（Ⅱ/Ⅲ）區分只在 code 字串，不在 `grade_band` 欄。年段徽章 `GradeBandBadge.detectGradeFromCode()` 正確改讀 code，無誤。
- **連帶清整（同次盤點，使用者逐項授權執行）**:
  1. **補 water-solution 大節點掛載**：示範單元 `unit-water-solution` 先前 `unit_parent_nodes` 為 0 筆，後台「管理大節點」modal（走 `useUnitParentNodes`）看不到其大節點。已 INSERT 2 筆（`pnode-water-solution-ine-3` / `-ine-5`，sort_order 0/1）。
  2. **刪 6 筆空殼 parent_nodes**（docx 匯入雜訊，kn=0 且 attached=0）：`pnode-id-inc-13`、`pnode-noteunit-inc-13`、`pnode-la-ine-ii-1-9faa98`、`pnode-noteunit-ine-1`、`pnode-me-inf-ii-5`、`pnode-noteunit-inf-5`。parent_nodes 209→203。其餘重複 code 的「本尊」（有 kn 或 attached）全數保留；同 code 跨不同單元屬合理共用（如 `INe-Ⅱ-3` 同時存在 unit-jb 與 unit-water-solution），非錯誤。
     > ⚠️ **2026-06-03 後續更正**：本點對 `INe-Ⅱ-3` / `INe-Ⅲ-5` 的「合理共用」認定已被**同日稍晚的去重**推翻——該 pair 實為「legacy 掛在教學單元（非次主題）」的歷史誤建，已於 migration 0025 合併去重。詳見本檔最上方〈去重 water-solution 大節點（migration 0025）〉。第 1 點所 INSERT 的 2 筆綁定亦改指 canonical 節點。
  3. **重排 3 單元畫布**（SOP §4.3：群組間 x ≥ 460、卡片寬 240）：`unit-ea` / `unit-ab` / `unit-kc` 原群組 x 區間互相穿插，已整群平移至不重疊區段（77 個節點座標更新）。`unit-ea` 因 docx 匯入時群內節點本就散落，採「整群不重疊、不動群內相對位置」方案（使用者選 a），故單元總寬較大但群組清楚分離。
- **未處理 / 保留**:
  - 96 個空大節點（多為 `pnode-noteunit-*`，unit_id NULL 的課綱母清單）暫留，待確認是否為後台指派來源池。
  - `INb-Ⅲ-4`（無「新增」字樣）兩筆接近空殼，因 unit-eb 那筆 attached=1，保守保留待人工確認。
- **備份**: `backend/backups/pre_fixes_20260603_155435.sql`；套用腳本留存 `backend/backups/apply_d4_d6.sql`、座標清單 `backend/backups/moves.json`。
- **驗證**: D4 刪除後無新孤兒 kn（0）；D6 三單元群組 x 區間驗證互不重疊 ✅。
- **Spec 已更新**: ✅（本筆 deviations；spec-11 雙軸模型理解已澄清於此）

---

### [2026-06-03] 知識節點編號統一為 Unicode 羅馬數字（覆蓋「禁止改編號格式」鐵律）

- **涉及 Spec / 規範**: `CLAUDE.md`「禁止事項 — 禁止修改知識節點 ID 格式」、`CLAUDE.md`「領域知識速查」、`docs/spec-11-database-schema.md`（knowledge_nodes / misconceptions / quizzes）、`docs/sop-knowledge-node-canvas-import.md` §5
- **背景**: 資料一致性盤點發現 24 個知識節點 id 仍使用**英文 `II` / `III`**（其餘節點皆為 Unicode 羅馬數字 `Ⅱ`=U+2161 / `Ⅲ`=U+2162），其中含 docx 匯入殘留與一筆四段手誤 `INc-II-2-1-2`。使用者於 2026-06-03 **明示授權全面統一**，並確認接受動到示範題組（quiz-001/002，含 MEMORY 標記「不要動」的 `INe-II-3-*`）。
- **⚠️ 鐵律覆蓋說明**: CLAUDE.md 原寫「禁止修改知識節點 ID 格式（特別注意 `INe-II-3-*` 與 `INe-Ⅲ-5-*` 兩種前綴並存）」。本次經使用者明確指示後**一次性覆蓋**此鐵律，將英文寫法全面正規化為羅馬數字；自此系統內**不再並存**英文 II/III 寫法。
- **替代方案 / 執行**:
  1. **備份**: 執行前 `pg_dump` 全庫 → `backend/backups/pre_romanize_20260603_153211.sql`（可回滾）。
  2. **Migration** `0024_romanize_node_ids`（`backend/alembic/versions/20260603_0024_romanize_node_ids.py`）：24 筆 `knowledge_nodes.id` 改名（含 `INc-II-2-1-2`→`INc-Ⅱ-2-2` 手誤修正）；連帶 `misconceptions.node_id`（先卸 `misconceptions_node_id_fkey`→改→重掛，因該 FK 為 ON UPDATE NO ACTION）、`quiz_questions.knowledge_node_id`、`quizzes.knowledge_node_ids`(text[])、`knowledge_nodes.prerequisites`(text[])、`custom_misconceptions.node_id`。附帶修 `INe-Ⅲ-10-08` 先備的英文 III 錯字、`INc-Ⅲ-15-1` 名稱開頭重複編號。具 `downgrade()`。
  3. **後端種子**: `knowledge_nodes_seed.json` / `quizzes.json` / `scenarios.json` 三檔的 `INe-II-3-*`→羅馬（確保 `seed --reset` 不會打回英文）。
  4. **前端**: 14 個原始碼檔（`quizData.js`、`followUpEngine.js`、`followUpPrompts.js`、`KnowledgeMap.jsx`、`Step1Nodes.jsx`、`AppContext.jsx`、`theme.js`、`NodeBadge.jsx`、`KnowledgeSkillTree.jsx`、`StudentReport.jsx`、`LoginPage.jsx`、`NewKnowledgeNodeModal.jsx`、`__loadtest__/{meta.json,answers.large.js}`）的寫死 `INe-II-3-*`→羅馬。
- **影響範圍**: 僅 `INe-II-3-*`（示範題組那 5 個）寫死於前端/種子；其餘 19 個英文編號僅存在於 DB（docx 匯入），不在原始碼。學生作答歷史透過 `quiz_questions` FK 保留、不受影響。
- **驗證**:
  - DB: `alembic upgrade head` → 0024 ✅；英文編號殘留 0、手誤已修、20 條迷思與 8 題出題正確跟轉、quiz 陣列全羅馬、先備 0 斷鏈、FK 0 孤兒 ✅
  - 前端: `npm run build` ✅（11.13s）、`npm run lint` ✅（0/0）
  - 中文編碼: UTF-8 無 BOM 寫回，抽查中文完好 ✅
- **遺留事項**:
  - backend 容器**未掛載**原始碼（image build-in），本次以 `docker cp` 將 migration 送入執行中容器套用；**下次 rebuild image 才會內含 0024**，新環境直接 `alembic upgrade head` 即可。
  - 容器內未安裝 `ruff`/`uv`（CLAUDE.md 假設 `uv run ruff`），migration 改用 **host ruff 0.15.12** 檢查通過（`All checks passed!`）。
- **Spec 已更新**: ✅（本筆 deviations + CLAUDE.md「禁止事項」與「領域知識速查」改為「統一羅馬數字、不再並存」）

---

### [2026-05-28] AssignmentManagement 從 N×M 矩陣改為雙視角卡片列表
- **涉及 Spec**: `spec-02-routes-and-pages.md` §2.6
- **問題**: 原 spec §2.6 規定「派題矩陣（列為題組、欄為班級）」，但實際在多班級（10+）多題組情境下，矩陣會雙向滾動、認知負擔過高，且最常見動作「派發到多班」需要點 N 次格子。
- **替代方案**:
  1. 改為雙視角卡片列表：題組視角（每題一張卡，內含已派班級進度 + 未派 pill 群）與班級視角（每班一張卡，內含已派題組進度 + 未派 pill 群）
  2. 視角切換存 `localStorage.scilens.assignmentViewMode`
  3. 拆檔到 `src/pages/teacher/assignment/`：`ViewTabs.jsx` / `OverviewBar.jsx` / `QuizCardView.jsx` / `ClassCardView.jsx` / `assignmentStats.js`
  4. 既有 `AssignmentMatrixParts.jsx` 的 `AssignPopover` / `ManagePopover` 全部沿用不改
  5. 移除原 N×M table / 矩陣圖例（顏色資訊改由進度條傳達）
- **Spec 已更新**: ✅（§2.6 完整改寫）
- **Phase 2 後續**：多選班級批次派發、狀態 filter chip、搜尋

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

### [2026-05-22] 開始落地《迷思成因診斷強化 v1》— Phase 1：成因類型擴充 + 新增問題類型軸
- **涉及 Spec**: `docs/功能修改文件_迷思成因診斷強化_v1.md` §2.3 / §2.4、spec-04（後續 phase 才同步擴充）
- **問題**: v1 修改文件 §2.3 提出全新 6 類成因（daily-experience / language-confusion /
  over-generalization / intuitive-reasoning / teaching-residue / causal-inversion），
  但與現行 `src/data/misconceptionCauses.js` 已實作的 8 類成因衝突——部分名稱重疊
  （如「日常經驗干擾」≈ 現行 #5、「語言概念混淆」≈ 現行 #6、「直覺思維」≈ 現行 #4、
  「教學簡化遺留」≈ 現行 #7），但現行 #1「學科知識不足」、#2「概念不清楚」、
  #3「推論錯誤」、#8「實驗操作不當」在 v1 文件裡完全沒有對應，整套換掉會丟失既有
  教師端 `/teacher/misconception-causes`、`MisconceptionCauseDonut`、`StudentDiagnosisReport`
  的呈現與診斷分類資訊。
- **替代方案**:
  1. **保留現行 8 類不動**，僅補進 v1 特有的 2 類，總共 10 類：
     - id=9「過度類推」（color: `orange`，#FAD7A0 / #CA6F1E）
     - id=10「因果倒置」（color: `red`，#FADBD8 / #C0392B）
  2. 新增的 2 類在 `src/data/misconceptionCauses.js`（central registry）與
     `src/pages/teacher/MisconceptionCauses.jsx`（feature / sample 卡片詳情）兩處同步補上。
  3. **問題類型獨立成新檔** `src/data/problemTypes.js`，採 3 類設計（observation /
     definition / explanation）。問題類型與成因類型互不替代而是「雙軸」：
     成因類型回答「為什麼學生會這樣想」，問題類型回答「學生卡在哪個認知層次」。
  4. v1 文件 §2.3 表格旁加註標頭，指向本筆偏離；6 類提案表保留作為設計史。
- **影響範圍**: 既有資料與 UI 不受破壞；待 Phase 2 才會在 `quizData.js` /
  `knowledgeGraph.js` 為每個選項 / 迷思補上 `causeAnalysis` 與 `problemType` 欄位。
- **未動到的項目**:
  - `quizData.js`、`knowledgeGraph.js`、`followUpData.js` 的選項 / 迷思 / 對話結構（Phase 2-4 才動）
  - 教師端 dashboard 的圖表元件（Phase 3 才新增 `ProblemTypeChart`、`CauseTypeChart`）
- **Spec 已更新**: ✅（v1 文件 §2.3 補加註；本筆 deviations.md）；後續 Phase 動到資料結構時再同步 spec-04

---

### [2026-05-25] 移除「概念釐清・補救」整個模組

- **涉及 Spec**: spec-02 §2.6.*、spec-03（學生端 Scenario* / 教師端 Treatment*）、spec-04（scenarioQuiz / treatmentSession）、spec-05 §3.5 概念釐清流程、**spec-08 整份**、spec-09（治療 LLM）、spec-10 `/api/scenarios/*` + `/api/treatment/*`、spec-11 `scenarios` + `treatment_sessions` + `treatment_messages`、spec-12 治療相關 RAGFlow、`docs/workflow.md`、`docs/usecase-teacher.puml` + `usecase-student.puml`
- **問題**: 指導教授決策——實驗系統不再需要「概念釐清・補救」這條教學流程，要求整段拔除。原本 sidebar ④ 區塊（釐清題組編輯、派發釐清題組、概念釐清結果、釐清對話紀錄）以及學生端「概念釐清」任務區塊全數退場。
- **替代方案**:
  1. **前端徹底移除**：
     - 路由：`/teacher/scenarios`、`/teacher/scenarios/create`、`/teacher/scenarios/:id/edit`、`/teacher/assignments/scenarios`、`/teacher/treatment-outcomes`、`/teacher/treatment-logs`、`/teacher/treatment-logs/:sessionId`、`/student/scenario/:scenarioQuizId` 全部刪除。
     - 頁面：`TreatmentOutcomes`、`TreatmentLogs`、`TreatmentLogDetail`、`scenarios/ScenarioLibrary`、`scenarios/ScenarioCreateWizard`、`student/ScenarioChat` 整檔刪除。
     - 共用：`hooks/useScenarios`、`hooks/useTreatment`、`data/scenarioQuizData`、`data/treatmentBot*`、`lib/scenarioImage`、`lib/treatmentOutcomes`、`components/student/Scenario*`、`components/student/MascotHintBubble`、`components/student/ReflectionPanel`、`components/teacher/AssignTargetPicker`、`dashboard/shared/TreatmentEffectivenessPanel` 全部刪除。
     - 修改：`App.jsx` 拔路由、`TeacherLayout.jsx` 拔 ④ 區塊、`TeacherDashboard.jsx` 拔流程二卡片、`useTeacherStageStatus` 拔 `remediation`、`AssignmentManagement.jsx` 簡化成 diagnosis-only、`AssignmentMatrixParts.jsx` 拔 `isScenario` 分支、`StudentHome.jsx` 拔概念釐清區塊、`ClassDetailPage.jsx` 拔 treatment 報告 tab、`TaskCard.jsx` 簡化成 diagnosis-only、`ChatStream.jsx` 拔預設 export（保留 `Bubble` / `ThinkingBubble` 給診斷追問用）、`tourSteps.js` 拔 SCENARIO_* / TREATMENT_* / ④ 步驟、`assignmentData.js` 拔 scenario 範例派題、`StudentSettingsDrawer.jsx` / `LoginPage.jsx` / `DistractorSuggestPopover.jsx` / `AppContext.jsx` / `useAssignments.js` 註解文字清理。
  2. **後端保守處理**：`backend/app/main.py` 將 `scenarios_router` 與 `treatment_router` 的 import 與 `include_router` 全部註解掉，router 實作檔、ORM model（`scenario.py` / `treatment.py`）、Alembic migration、seed data 全保留，未來若要重新啟用只需把註解打開即可。
  3. **spec-08 整份保留但於最上方加 DEPRECATED 標記**，避免設計脈絡遺失。其他 spec（02/03/04/05/09/10/11/12）對應段落直接移除或改為「已下線」標記。
- **影響範圍**: 前端教師端只剩 ①出診斷題 → ②派題 → ③看診斷結果 三步驟流程；學生端只剩「迷思診斷」任務區塊。診斷追問（POE）流程不受影響、繼續存在。
- **未動到的項目**: 後端 router 實作、DB schema（為了不破壞既有 seed/migration），可隨時恢復。
- **驗證**: `npm run lint` ✅、`npm run build` ✅、preview 載入教師首頁 + sidebar + 學生首頁皆無概念釐清字眼。
- **Spec 已更新**: ✅（本筆 deviations + spec-08 標 DEPRECATED + spec-02/03/04/05/09/10/11/12 移除對應段落 + CLAUDE.md 索引更新）

---

### [2026-05-22] 新增「概念釐清結果」頁，治療成效衍生暫放前端
- **涉及 Spec**: spec-02 §2.6.2、spec-05 §3.5、spec-08 §5.5、spec-11 §3.13
- **問題**: 教師完成「概念釐清題組」派發 → 學生作答後，原本教師端只能看到完整對話紀錄
  （`TreatmentLogDetail`）。對話雖完整保留 phase/stage/step/hintLevel，但難以一眼看出
  「這位學生治療有沒有用」。需要一個彙整成效的頁面。
  同時，學生端 `flowStage='reflection'` 的反思文字與 `flowStage='result'` 的三星評等
  在後端 `treatment_sessions` 表上尚無對應欄位，無法持久化。
- **替代方案**:
  1. 新增 `/teacher/treatment-outcomes` 頁面（`TreatmentOutcomes.jsx`），呈現
     per-question outcome pills / 整體星等 / AI 判定是否釐清 / 反思摘要 / 班級層級彙整。
  2. **衍生規則先放前端 `src/lib/treatmentOutcomes.js`**：從 `treatment_messages` 反推
     maxHintLevel + reachedComplete → outcome label。介面契約以 spec-08 §5.5 為準。
  3. **學生反思文字**：UI 預留欄位，因後端尚無 `reflection_text` 欄位，目前顯示「學生未撰寫」。
  4. **星等**：由前端 outcome weights 衍生（avg weight → 0~3⭐）；學生端 `flowStage='result'`
     實際計算的星等暫未回寫後端。
- **後端待辦（標 P5）**:
  - `treatment_sessions` 加 `reflection_text TEXT NULL` 與 `star_rating SMALLINT NULL`
  - `/api/treatment/sessions/{id}/complete` 接受 `{ reflectionText, starRating }`
  - 新建 `app/services/treatment_outcome_service.py`，把 lib 的衍生規則搬到後端
  - `/api/teachers/treatment-logs` 列表直接回傳 outcome 摘要欄位（避免前端 N+1 fetch messages）
- **Spec 已更新**: ✅（spec-02 / spec-05 / spec-08 同步更新；spec-11 待 P5 時補欄位）

---

### [2026-05-14] 治療對話加入 LLM 驅動模式（scenario-002 Q2）
- **涉及 Spec**: spec-08 §2.3 / §8 / §8B、spec-09 §12、spec-11 §3.14
- **問題**: 既有 `runTreatmentTurn` 是純 rule-based mock，所有題目共用同一套
  prompt pool，AI 回應與學生實際輸入無關，無法執行認知衝突 / 概念驗證 /
  CER 整理等真正的教學行為。研究端需要一份能依照「診斷型科學論證 AI 導師」
  完整 prompt（含 FSM、hintLevel、feedback 規則）跑的 LLM 對話，先在
  scenario-002 飽和糖水甜度 Q2 試行。
- **替代方案**:
  1. 新增 `src/data/treatmentBotPrompts.js` — 以 `${scenarioQuizId}#${questionIndex}`
     為 key 的 prompt registry。目前只登錄 `scenario-002#2`。
  2. 新增 `src/data/treatmentBotLlm.js` — `runTreatmentTurnLlm(state, msg)`：
     組裝 system+history+「對話狀態交接」+ student → 呼叫 `chat()` → 三段式
     JSON 解析（直接 parse → 去 code fence → 抓 balanced `{}`）→ `normalizeBotResponse`
     clamp 數值與補預設。
  3. `treatmentBot.js` 的 `runTreatmentTurn` 改為 async dispatcher：
     - 有登錄 prompt → 走 LLM
     - LLM 失敗（網路 / 解析）→ console.warn + fallback 到 `runTreatmentTurnMock`
     - 沒登錄 → 直接走 mock
  4. ScenarioChat 的 `handleSend` 改成 `await runTreatmentTurn(...)`，移除
     原本 700ms 假思考延遲（LLM 本身就有 latency），並加上錯誤訊息泡泡。
  5. **phase 擴增**：prompt FSM 把 step 6 標為 `phase=cer`，DB schema /
     Pydantic Literal 同步加上 `cer`，新增 alembic migration `0008_treatment_phase_cer`
     drop & re-add CHECK constraint。
  6. **題目文字對齊**：把 scenario-002 Q2 的 scenarioText / initialMessage
     改寫成 prompt 裡的固定情境（含第 1/2/3/6/7 匙紀錄、甜度變化圖、燒杯圖），
     確保 LLM 看到的題目 = 學生看到的題目。前端 `scenarioQuizData.js` 與後端
     `backend/app/seed/data/scenarios.json` 同步更新。
- **驗證**: 在 dev preview 確認：
  - Q1（無登錄 prompt）→ 沒打 `/api/llm/chat`，走 mock ✓
  - Q2 LLM 路徑 → `POST /api/llm/chat 200` ✓，回傳結構化 JSON 並符合 step 1→2 / claim→evidence / hintLevel 0 等 FSM 規則 ✓
- **Spec 已更新**: ✅（spec-08 §2.3 / §8 / §8B、spec-09 §12、spec-11 §3.14）

---

### [2026-05-07] 引入教師範圍資料隔離 + 上線教師帳號 bbb001
- **涉及 Spec**: spec-10 §6（routers）、spec-11 §3.3（classes）、spec-13 §2
- **問題**: 系統準備上線，需要在 demo 教師（aaa001）之外另開一個正式使用的
  教師帳號（bbb001 / 黃老師），且該帳號不能看到 aaa001 的示範班級 / 學生 /
  派題 / 作答 / 治療紀錄。原本 backend 沒有教師層級隔離，所有教師看到所有
  班級，沒辦法做到這個區隔。
- **替代方案**:
  1. **schema**：在 `classes` 加 `teacher_id` (nullable FK → users.id, ON
     DELETE SET NULL) + index。新增 alembic migration `0003_class_teacher_id`
     會自動把既有班級回填成 `aaa001`（idempotent，跳過 users 表還沒 seed
     的情況）。
  2. **API 範圍化**：`GET/POST/PATCH /api/classes`、`GET /api/assignments`
     (teacher 分支)、`POST/PATCH /api/assignments`、`GET /api/students/{id}`、
     `POST /api/students/{id}/reset-password`、`GET /api/quizzes/{id}/answers`、
     `GET /api/quizzes/{id}/stats`、`GET /api/teachers/treatment-logs[/{id}]`、
     `POST /api/ai/grade-summary`、`POST /api/ai/class-summary` 全部加上
     `Class.teacher_id == current_teacher.id` 檢查。
  3. **stats_service.get_grade_stats**：新增 `teacher_id` kwarg；ai_service
     的 N1 prompt 組裝跟著傳。
  4. **題庫不隔離**：`quizzes`、`scenario_quizzes` 維持所有教師共用，因為
     使用者明確指定「診斷出題和概念釐清出題是系統不管哪些帳號都會看到的範例
     內容」。
  5. **seed.py**：拆出 `_seed_one_teacher()` 同時建立 aaa001（demo）和
     bbb001（黃老師、空白），新班級寫入時自動帶 `teacher_id=aaa001`；既
     有班級若 `teacher_id IS NULL` 也回填為 aaa001。
- **Spec 已更新**: ✅（spec-10 端點欄位、spec-11 §3.3、spec-13 §2.1）

---

### [2026-05-07] 概念釐清題組 demo 收斂為 1 份（只留 scenario-002）
- **涉及 Spec**: spec-02 §1.2、spec-04 §2.4 / §2.9、spec-05 §3.1、spec-08 §10、spec-11 §6.4、spec-12 §8.2 / §8.4
- **問題**: 原本 5 份 demo 概念釐清題組涵蓋多個節點，但目前只需要保留 `scenario-002（飽和糖水甜度，INe-II-3-03）` 作為唯一示範。
- **替代方案**:
  1. 刪除 `scenario-001/003/004/005`（前端 mock + 後端 seed JSON）
  2. 派題資料同步刪除 `assign-005/007/008`（指向被刪除的 scenario）；保留 `assign-006`（指向 scenario-002，targetType='students'，studentIds=['115002','115007']）
  3. 後端 mock 服務（`ai_service.py`、`ragflow_service.py`）的提示文字裡的 scenario-001/003/004/005 也一併移除/改寫成只引用 scenario-002
  4. spec 範例表格 / 文字 / 預設資料區段同步收斂
- **影響範圍**: demo 內容變少；前端 `getScenarioQuizzesByNode/Misconception` 對於 M02/M05/M10/M12 系列迷思找不到推薦概念釐清題組（合理，因為已不存在）
- **未刪除的素材**: `src/assets/scenarios/{2-3-sugar-saturation-layer,level4-1-soil-ph-years,level4-1-soil-ph-yield,level5-2-acid-gas}.png` 暫無引用，但保留 png 檔以備將來重新加入時使用
- **Spec 已更新**: ✅
- **遷移注意**: 既有環境需重跑 `seed --reset` 才會清掉舊的 scenario 與派題資料

---

### [2026-05-06] 概念釐清派題改為「以個別學生為單位」
- **涉及 Spec**: spec-04 §2.4、spec-05 §1.3 / §3.2、spec-10 §6（hooks）、spec-11 §3.10 / §3.10b、workflow.md §3.4
- **問題**: 原規格 `assignments` 只有 `class_id`，所有派題都是整班派發。但實際使用情境是「教師依診斷結果，挑出迷思較多的個別學生派發概念釐清治療題組」——對班上其他不需治療的學生派發只會增加干擾。
- **替代方案**:
  1. **資料模型**：`assignments` 新增 `target_type ∈ {'class','students'}`；新增關聯表 `assignment_students(assignment_id, student_id)`，僅在 `target_type='students'` 時寫入。
  2. **業務分工**：診斷派題仍維持整班 (`target_type='class'`)；概念釐清派題預設個別學生 (`target_type='students'`)。
  3. **UI**：`AssignmentManagement` 的概念釐清分頁改用 `AssignTargetPicker`（modal-style）：每個（概念釐清題組 × 班級）格子打開該班學生勾選視窗，教師手動勾選後派發。跨班則重複此流程。
  4. **預選策略**：picker 不做自動預選（即使學生診斷出多條迷思也不預先勾起），由教師完全自主決定。
  5. **學生視角過濾**：後端 `list_assignments` 對 student 角色多加一條：`target_type='students'` 時必須 `student.id ∈ assignment_students`。
  6. **完成率分母**：`target_type='students'` 時 = `len(assignment_students)`；`target_type='class'` 時 = 班級總人數（既有行為）。
- **同步更新項目**:
  - 後端：`backend/app/db/models/assignment.py`、新增 `assignment_student.py`、新 migration `0002_assignment_students`、`schemas/assignment.py`、`routers/assignments.py`、seed JSON + `seed.py`
  - 前端：`src/data/assignmentData.js`、`src/components/teacher/AssignTargetPicker.jsx`（新元件）、`src/pages/teacher/AssignmentManagement.jsx`、新 `AssignmentMatrixParts.jsx`（拆分以符合 500 行限制）
- **Spec 已更新**: ✅（spec-04、spec-05、spec-10、spec-11、workflow.md 已同步）
- **遷移注意**: 既有環境需先跑 `alembic upgrade head` 補上 `target_type` 欄與 `assignment_students` 表，再重跑 seed（`--reset` 或對既有 scenario assignment 手動補 `assignment_students` 列）。

---

### [2026-04-28] Demo 單元由「溫度與熱」全面切換為「水溶液」
- **涉及 Spec**: spec-01 §6、spec-04 §1.1 / §2.2 / §2.3 / §2.5、spec-05 §2.2、CLAUDE.md「領域知識速查」
- **問題**: 研究方向調整，原本國中三年級「溫度與熱」demo 不再符合新研究對象（國小高年級學童），需全面替換 demo 內容。
- **替代方案**: 依《功能修改文件_demo單元切換水溶液_v1》執行：
  1. 知識節點：8 個（INa-Ⅲ-8-*）→ 12 個（INe-II-3-* 五個 + INe-Ⅲ-5-* 七個）
  2. 迷思概念：每節點固定 4 條，總計 48 條（編號 M01-* ~ M12-*）
  3. 兩份示範題組：標題改為「水溶液 · 迷思診斷（第一/二次）」，皆涵蓋同組 5 個節點（INe-II-3-02、03、05；INe-Ⅲ-5-4、7）
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
  1. **單元適配**：第二層所有追問模板（情境引導、對比情境、二選一、遷移測試、探究來源）改寫為 5 個示範題組涵蓋的水溶液節點（INe-II-3-02、03、05；INe-Ⅲ-5-4、7）；語氣由「同學」改為「老師想⋯」適合國小生。
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

### [2026-05-03] 派題管理頁空白 + 學生端 500 + 學生無法載入題組（系統巡檢）
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

---

### [2026-05-29] 班級分類視圖以 localStorage 暫存（後端化延後）→ **同日正式化** ✅
- **涉及 Spec**: spec-02b §2.7（ClassManagement）、spec-04 §5.1、spec-10 §6（路由表）、spec-11 §3.3 / §3.3b
- **背景**: 教師希望班級管理頁可自訂分類、班級可拖曳跨分類移動。先以 localStorage 出 PoC、確認 UX 後同日整套搬到後端。
- **PoC（已過時）**:
  - 曾新增 `src/hooks/useClassCategoriesLocal.js`：localStorage key `teacher_class_categories_v1:{teacherId}`。
  - ClassManagement 新增 `groups` 視圖（預設），用 `ClassCategorySection` + `ClassMiniCard` 渲染；DnD 走 `@dnd-kit`。
  - 已刪除 `useClassCategoriesLocal.js`，UI 元件不變。
- **正式化（採用）**:
  1. **DB**：新增 `class_categories` 表（id / teacher_id / name / sort_order / timestamps，UNIQUE (teacher_id, name)）；`classes` 新增 `category_id` FK `ON DELETE SET NULL`。Migration `0020_class_categories`。
  2. **後端**：`app/db/models/class_category.py`、`app/schemas/class_category.py`、`app/routers/class_categories.py`（GET / POST / PATCH / DELETE / PUT reorder）；`classes` 的 PATCH 支援 `categoryId`（會驗證屬於該教師）；`ClassBrief` schema 暴露 `categoryId`。
  3. **前端**：新增 `src/hooks/useClassCategories.js`（React Query 包後端 CRUD）；ClassManagement 改用 server 端 `class.categoryId` 渲染，DnD 落下時呼叫 `useUpdateClass.mutate({ classId, categoryId })`。
  4. **一次性遷移**：ClassManagement 掛載時自動偵測舊版 `teacher_class_categories_v1:{teacherId}` localStorage，若有資料就 POST 到後端後清掉 key（碰到重名分類自動重用既有的）。教師若在過渡期試過 PoC 就無感升級。
- **同步更新項目**:
  - 程式：新增 `backend/alembic/versions/20260529_0020_class_categories.py`、`backend/app/db/models/class_category.py`、`backend/app/schemas/class_category.py`、`backend/app/routers/class_categories.py`、`src/hooks/useClassCategories.js`；改 `backend/app/db/models/{__init__.py, class_.py}`、`backend/app/schemas/class_.py`、`backend/app/routers/classes.py`、`backend/app/main.py`、`src/pages/teacher/ClassManagement.jsx`；刪 `src/hooks/useClassCategoriesLocal.js`。
  - Spec：spec-02b §2.7（改寫分類視圖說明）、spec-04 §5.1（從「localStorage 暫存」改寫為「後端 + 自動遷移」）、spec-10 §6（補 5 條 `/api/class-categories` 端點 + PATCH classes 支援 categoryId）、spec-11 §2 / §3.3 / §3.3b（新增 `class_categories` 表 + `classes.category_id` 欄位）
- **驗證**:
  - 後端 `python -m ruff check`（新增/改動檔案）✅
  - Migration `alembic upgrade head` ✅
  - 前端 `npm run build` + `npm run lint` ✅
  - Preview 手動測試：登入示範老師 → 新增分類 → 拖曳班級跨分類 → 重整頁面後分類關係保留 ✅
- **Spec 已更新**: ✅（spec-02b、spec-04、spec-10、spec-11 全部同步）
