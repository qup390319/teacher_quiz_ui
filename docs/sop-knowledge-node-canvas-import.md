# SOP：從 108 課綱 Word 檔解讀「知識節點關聯圖」並寫入畫布

> 目標讀者：負責批次把課綱 docx 的關聯圖搬到 SciLens 知識節點畫布的人。
>
> 配套腳本：`scripts/docx_to_pages.py`
>
> 配套 API：見本文 §4。

---

## 0. 為什麼這支 SOP 存在

108 課綱知識節點關聯圖以 Word 檔提供，幾十份要逐一處理。Word 內的箭頭是 DrawingML `<a:cxnSp>` 連接線，但**沒有顯式 start/end shape 關聯**——只有畫面座標。直接用 XML 反推會碰到：

- 中文羅馬數字 `Ⅱ` / `Ⅲ` 在 cp950 環境經常出錯
- `mc:AlternateContent` / `mc:Choice` / `mc:Fallback` 三層巢狀
- 連接線方向只能靠 `flipH`/`flipV` + 兩端是否有 `<a:tailEnd>` / `<a:headEnd>` 推
- 端點要再用「最近 shape」演算法回推到對應節點

實測下來，**把每頁渲染成 PNG，再用 LLM 視覺辨識箭頭**比硬解 XML 還精準。本 SOP 描述這條路徑。

---

## 1. 環境需求

| 項目 | 版本 | 用途 |
|---|---|---|
| Windows | 10 / 11 | 跑 Word COM |
| Microsoft Word | 2016+ | docx → PDF（保留 SmartArt / 連接線） |
| Python | 3.10+ | 跑 `scripts/docx_to_pages.py` |
| Python 套件 | `pypdfium2`, `Pillow`, `pywin32` | PDF 渲染 + Word COM |
| Claude Code | 任何版本 | 視覺辨識 + 呼叫 admin API |

安裝 Python 套件：

```powershell
python -m pip install pypdfium2 Pillow pywin32
```

> 沒有 Word 的環境可以改用 `soffice --headless --convert-to pdf`（LibreOffice）；但某些連接線會被誤渲染為直線，**箭頭方向會掉**。建議盡量用真 Word。

---

## 2. 流程總覽

```
       ┌─────────────────────────────────────────────────────────────┐
       │ ① scripts/docx_to_pages.py                                  │
docx ─▶│   Word COM 轉 PDF → pypdfium2 渲染每頁 PNG + 下半裁圖       │─▶ pageNN.png / pageNN_diagram.png
       └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │ ② 用 Read 工具讀每張 pageNN_diagram.png，視覺辨識：           │
       │   - 父節點代碼（橘色頂端方塊，例：INa-Ⅲ-3）                  │
       │   - 所有小節點代碼 + 名稱（藍色方塊）                        │
       │   - 箭頭：tail（先備）→ head（後續）                          │
       └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │ ③ 整理成「先備邊清單 + 群組座標」（記在回覆訊息裡留痕）         │
       └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │ ④ 直接呼叫 3 支 admin API（不必再徵詢同意）：                  │
       │   - bulk-set-canvas（把節點加到畫布）                         │
       │   - PATCH /admin/knowledge-nodes/{id}（寫先備）                │
       │   - bulk-positions（設座標，§4.3 鐵律：必送）                  │
       └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │ ⑤ 在 §6 表加一行紀錄；告訴使用者「已寫入，請畫布上自行檢查」    │
       └─────────────────────────────────────────────────────────────┘
```

---

## 3. 詳細步驟

### Step 1 — 把 docx 轉成 PNG 頁面

```powershell
python scripts/docx_to_pages.py `
  "C:\path\to\Ab_物質的形態、性質及分類_(1130901楊宗榮修正).docx" `
  --out "C:\Users\qup39\AppData\Local\Temp\scilens_pages\Ab"
```

腳本會輸出兩組檔案：

- `pageNN.png` — 整頁原圖
- `pageNN_diagram.png` — 同一頁裁掉上半（頁首 + 節點清單表格），只留下半的「關聯圖」區，視覺辨識更容易

### Step 2 — 視覺辨識關聯圖

每份 docx 通常有 **N+1 頁**：

| 頁 | 內容 | 動作 |
|---|---|---|
| Page 1 | 「次主題內容細目關聯圖」（父節點之間的關係） | **跳過**——畫布只放小節點 |
| Page 2..N+1 | 「知識節點關聯圖」每頁對應一個父節點 | 解讀並寫入畫布 |

對每張 `pageNN_diagram.png`：

1. **找橘色頂部方塊** → 這是父節點代碼（例：`INa-Ⅲ-3`）
2. **找所有藍色方塊** → 這些是小節點代碼（例：`INa-Ⅲ-3-01` 到 `INa-Ⅲ-3-05`）
3. **追箭頭**：
   - 箭頭從 A 指向 B → `B` 的 prereq 包含 `A`
   - 圖通常自下往上指向父節點，所以**底部節點 = 鏈起點**（無 prereq）
   - 多條鏈並列的情況：左右兩鏈彼此獨立

### Step 3 — 整理邊清單 + 群組座標（**留痕，不等審核**）

把以下資訊放進回覆訊息（讓使用者事後翻聊天紀錄能對照），然後**直接執行下一步**：

```
【Page 3 — INa-Ⅲ-3「混合物是由不同的物質所混合…」】

左鏈（混合 → 酸鹼）：
  INa-Ⅲ-3-01 → INa-Ⅲ-3-02 → INa-Ⅲ-3-03 →（父）
右鏈（導電）：
  INa-Ⅲ-3-04 → INa-Ⅲ-3-05 →（父）

3 條先備邊：
  - INa-Ⅲ-3-02 ← INa-Ⅲ-3-01
  - INa-Ⅲ-3-03 ← INa-Ⅲ-3-02
  - INa-Ⅲ-3-05 ← INa-Ⅲ-3-04

5 個節點 onCanvas = true
群組 x 區段：col1=800 / col2=1100（接在 INa-Ⅲ-2 的 maxX=340 右邊 + gap=460）
```

> 2026-05-29 規則更新：使用者已授權批次寫入，無須再等「順序對」確認。
> 寫完到 §6 表加一行；使用者會自行打開畫布抽查。

### Step 4 — 呼叫 admin API

在 admin 登入態下（瀏覽器 cookie 或本機 curl），按順序送 3 種 request：

#### 4.1 把節點加到畫布

```
POST /api/admin/knowledge-nodes/bulk-set-canvas
{
  "nodeIds": ["INa-Ⅲ-3-01", "INa-Ⅲ-3-02", "INa-Ⅲ-3-03", "INa-Ⅲ-3-04", "INa-Ⅲ-3-05"],
  "onCanvas": true
}
```

回 204。**欄位名是 `nodeIds`**（不是 `ids`，曾踩過）。

#### 4.2 寫先備（每條邊一個 PATCH）

```
PATCH /api/admin/knowledge-nodes/INa-Ⅲ-3-02
{"prerequisites": ["INa-Ⅲ-3-01"]}

PATCH /api/admin/knowledge-nodes/INa-Ⅲ-3-03
{"prerequisites": ["INa-Ⅲ-3-02"]}

PATCH /api/admin/knowledge-nodes/INa-Ⅲ-3-05
{"prerequisites": ["INa-Ⅲ-3-04"]}
```

`prerequisites` 是「整個替換」——若節點原本有先備要保留，要把舊的也一起送。

#### 4.3 設座標（**這步千萬不能省，否則會與既有節點重疊**）

**⚠️ 鐵律：寫座標前必先查同 unitId 下既有節點的 bbox，新群組佔不重疊的 x 區段。**

```javascript
// Step A — 查現有 bbox
const all = await fetch('/api/admin/knowledge-nodes', { credentials: 'include' }).then(r => r.json());
const existing = all.filter(n => n.onCanvas && n.unitId === '<TARGET_UNIT_ID>');
const maxX = Math.max(0, ...existing.map(n => n.canvasX ?? 0));
// 新群組 x 起點 = maxX + 卡片寬(~260) + gap(~150) = maxX + 410
```

**標準座標方案**（卡片寬 ~260px，行高 186px = 自動排版預設）：

```
單一群組（單父節點下 N 個小節點 + M 條鏈）：
  col1 x = startX           # 主鏈
  col2 x = startX + 300     # 旁支
  y     = 40, 226, 412, 598 …  # 步進 186

群組間 gap：
  next_startX = (上一群組最後一欄 x) + 300
  # 例：INa-Ⅲ-2 用 x=40/340，下一群組 startX = 340 + 300 + 160 ≈ 800
```

範例（INa-Ⅲ-3 接在 INa-Ⅲ-2 右邊）：

```
POST /api/admin/knowledge-nodes/bulk-positions
{
  "positions": [
    {"id": "INa-Ⅲ-3-01", "x": 800,  "y": 40},
    {"id": "INa-Ⅲ-3-02", "x": 800,  "y": 226},
    {"id": "INa-Ⅲ-3-03", "x": 800,  "y": 412},
    {"id": "INa-Ⅲ-3-04", "x": 1100, "y": 40},
    {"id": "INa-Ⅲ-3-05", "x": 1100, "y": 226}
  ]
}
```

不要省略：前端「自動排版」按鈕只會在「使用者主動點」時跑，新節點若無座標會堆在 (0, 0) 互相蓋掉。

**驗收用 minimap**：右下小圖如果看到所有節點擠成一坨色塊 → 重疊；如果看到清楚分離的 N 個方塊群 → 對。

### Step 5 — 驗收

```
GET /api/admin/knowledge-nodes
→ 篩 ids 後檢查 onCanvas / prerequisites 全部正確
```

或直接打開 `/admin/knowledge-nodes` → 切到「知識節點畫布」tab → 在次主題下拉選對應的 unit → 截圖確認與原 docx 一致。

---

## 4. API 對照表

| 用途 | Method | Path | Body |
|---|---|---|---|
| 加入畫布 / 移回節點庫 | POST | `/api/admin/knowledge-nodes/bulk-set-canvas` | `{nodeIds: string[], onCanvas: boolean}` |
| 改先備（單筆） | PATCH | `/api/admin/knowledge-nodes/{id}` | `{prerequisites: string[]}`（整個替換） |
| 批次設座標 | POST | `/api/admin/knowledge-nodes/bulk-positions` | `{positions: [{id, x, y}]}` |
| 取單元清單 | GET | `/api/admin/knowledge-nodes` | — 回完整節點陣列 |

權限：以上都需要 `role=admin` 的 cookie。詳見 spec-10 §6。

---

## 5. 常見地雷

1. **`Ⅱ` vs `Ⅲ` 是羅馬數字（U+2161/U+2162），不是英文 `II`/`III`**
   - DB seed 已用羅馬數字，搜尋 / 比對都要保持
   - 在 PowerShell 印含羅馬數字的字串可能觸發 cp950 編碼錯，建議改寫到檔案或 stdout 轉 utf-8

2. **箭頭方向 ≠ 視覺方向**
   - Word DrawingML 的線段預設箭頭在 `tailEnd`（線段終點）
   - 視覺上「從 A 指向 B」對應「B 的 prereq 包含 A」——SciLens 的慣例是 `prerequisites = [先備節點 ids]`

3. **Page 1 是父節點層級不是小節點層級**
   - 第 1 頁的關聯圖是「課綱內容細目」（parent_nodes）間的關係，**不要試圖寫進畫布**
   - 畫布 schema 只收 knowledge_nodes（小節點）的先備

4. **`prerequisites` PATCH 是全量替換**
   - 若想新增一條而非取代，先 GET 拿到舊清單，加上新 id，再 PATCH 整個陣列

5. **節點若不在對應 unitId 下，畫布看不到**
   - 切換次主題下拉只會顯示 `unitId === 該次主題` 的節點
   - 從 GET 拿到的節點若 `unitId === null`，要先在「未分配」tab 指派單元

5b. **新群組座標不能撞既有節點 bbox**（2026-05-29 踩過）
   - 同一個 unitId 可能已有別組節點（前一批 docx 寫的）
   - 寫 `bulk-positions` 前必先 `GET /api/admin/knowledge-nodes` 篩 `onCanvas=true && unitId === target` 找 max `canvasX`
   - 新群組從 `maxX + 410` 起跳；詳見 §4.3 鐵律
   - 寫完一定要打開畫布 + minimap 目視確認分組不重疊

6. **重複跑同一份 docx 不會出錯**
   - bulk-set-canvas / bulk-positions 都是 idempotent
   - PATCH prerequisites 也是 idempotent（全量替換）
   - 但若已手動拖過位置，再呼叫 bulk-positions 會覆蓋

---

## 6. 已處理的 docx 清單

| docx | 父節點 | 小節點數 | 邊數 | x 區段 | 完成日期 |
|---|---|---|---|---|---|
| `Ab_物質的形態、性質及分類` | `INa-Ⅲ-2` | 4 | 2 | 40 / 340 | 2026-05-29 |
| 〃 | `INa-Ⅲ-3` | 5 | 3 | 800 / 1100 | 2026-05-29 |
| `Ba_能量的形式與轉換` | `INa-Ⅲ-5` / `INa-Ⅲ-6` | 5 | 3 | 自動 | 2026-05-29 |
| `Bb_溫度與熱量` | `INa-Ⅲ-8` | 8 | 8 | 樹狀（多層分岔） | 2026-05-29 |
| `Bd_生態系中能量的流動與轉換` | `INa-Ⅲ-9` / `INa-Ⅲ-10` | 5 | 2 | 自動 | 2026-05-29 |
| `Ca_物質的分離與鑑定` | `INb-Ⅲ-2` | 2 | 1 | 自動 | 2026-05-29 |
| `Cb_物質的結構與功能` | `INb-Ⅲ-1` / `INb-Ⅲ-4` | 14 | 11 | 多欄分支 | 2026-05-29 |
| `Da_細胞的構造與功能` | `INb-Ⅲ-5` / `INc-Ⅲ-7` | 2 | 0 | 自動 | 2026-05-29 |
| `Db_動植物體的構造與功能` | `INb-Ⅲ-6` / `INe-Ⅲ-11` | 10 | 8 | 多欄分支；INb-Ⅲ-7 植物節點未指派 unit 故跳過 | 2026-05-29 |
| `Dc_生物體內的恆定性與調節` | `INd-Ⅲ-5` | 1 | 0 | 自動 | 2026-05-29 |
| `Ea_自然界的尺度與單位` | 5 個 parents | 14 | 2 | col 0-4 | 2026-05-29 |
| `Eb_力與運動` | 5 個 parents | 9 | 4 | col 0-4；INb-Ⅲ-4 已在 Cb 處理 | 2026-05-29 |
| `Ec_氣體` | `INa-Ⅲ-4` | 1 | 0 | 自動 | 2026-05-29 |
| `Fa_組成地球的物質` | `INc-Ⅲ-10` / `INc-Ⅲ-11` | 5 | 2 | 自動 | 2026-05-29 |
| `Fb_地球與太空` | `INc-Ⅲ-13/14/15(新增)` | 8 | 5 | 自動 | 2026-05-29 |
| `Fc_生物圈的組成` | `INc-Ⅲ-8` / `INc-Ⅲ-9` | 2 | 0 | 自動 | 2026-05-29 |
| `Ga_生殖與遺傳` | `INd-Ⅲ-4` | 1 | 0 | 自動 | 2026-05-29 |
| `Gc_生物多樣性` | `INb-Ⅲ-8` / `INd-Ⅲ-6` | 4 | 1 | 自動 | 2026-05-29 |
| `Hb_地層與化石` | `INd-Ⅲ-8` | 1 | 0 | 自動；diagram 內其他 8-2..8-6 未在 DB | 2026-05-29 |
| `Ia_地表與地殼的變動` | `INd-Ⅲ-9` / `INd-Ⅲ-10` | 3 | 0 | 自動 | 2026-05-29 |
| `Ib_天氣與氣候變化` | `INd-Ⅲ-7` / `INd-Ⅲ-12` | 4 | 2 | 樹狀 | 2026-05-29 |
| `Ic_海水的運動` | `INd-Ⅲ-11` | 3 | 2 | 樹狀 | 2026-05-29 |
| `Id_晝夜與季節` | — | 0 | 0 | 跳過（unit 無 nodes；內容已在 Fb） | 2026-05-29 |
| `Ja_物質反應規律` | `INd-Ⅲ-1` / `INe-Ⅲ-2` / `INe-Ⅲ-4` | 14 | 10 | 三大群多欄分支 | 2026-05-29 |
| `Jc_氧化與還原反應` | `INe-Ⅲ-3` | 2 | 1 | 自動 | 2026-05-29 |
| `Jd_酸鹼反應` | — | 0 | 0 | 跳過（內容已在 unit-water-solution demo） | 2026-05-29 |
| `Ka_波動、光及聲音` | `INe-Ⅲ-6/7/8` | 13 | 4 | INe-Ⅲ-6 diagram 解析度不足、暫不寫邊 | 2026-05-29 |
| `Kc_電磁現象` | `INe-III-9` / `INe-III-10` | 12 | 10 | 樹狀（10-04 三向分岔再合流） | 2026-05-29 |
| `La_生物間的交互作用` | `INe-Ⅲ-13` | 1 | 0 | 自動 | 2026-05-29 |
| `Lb_生物與環境的交互作用` | `INe-Ⅲ-12` / `INg-Ⅲ-2` | 5 | 3 | 自動 | 2026-05-29 |
| `Ma_科學、技術及社會的互動關係` | `INf-Ⅲ-4` | 1 | 0 | 自動 | 2026-05-29 |
| `Mc_科學在生活中的應用` | `INf-III-6` | 1 | 0 | 自動 | 2026-05-29 |
| `Md_天然災害與防治` | `INf-III-5` | 4 | 1 | 自動 | 2026-05-29 |
| `Na_永續發展與資源的利用` | `INg-III-1` / `INg-Ⅲ-6` | 2 | 0 | 自動 | 2026-05-29 |
| `Nb_氣候變遷之影響與調適` | `INg-Ⅲ-3/4/7` | 4 | 0 | 自動 | 2026-05-29 |
| `Nc_能源的開發與利用` | `INg-Ⅲ-5` | 4 | 2 | 樹狀 | 2026-05-29 |

> 新增一份就在這張表記一筆，方便交接與 audit。

---

## 7. 進階：用 dry-run 自動產出邊清單（未實作）

下一步可寫 `scripts/canvas_apply.py`：

```
python scripts/canvas_apply.py edges.yaml --dry-run
python scripts/canvas_apply.py edges.yaml --apply --base-url http://localhost:8000 --cookie ...
```

YAML 範例：

```yaml
- parent: INa-Ⅲ-3
  children: [INa-Ⅲ-3-01, INa-Ⅲ-3-02, INa-Ⅲ-3-03, INa-Ⅲ-3-04, INa-Ⅲ-3-05]
  edges:
    - { from: INa-Ⅲ-3-01, to: INa-Ⅲ-3-02 }
    - { from: INa-Ⅲ-3-02, to: INa-Ⅲ-3-03 }
    - { from: INa-Ⅲ-3-04, to: INa-Ⅲ-3-05 }
  positions:
    INa-Ⅲ-3-01: [200, 200]
    INa-Ⅲ-3-02: [200, 350]
    INa-Ⅲ-3-03: [200, 500]
    INa-Ⅲ-3-04: [600, 200]
    INa-Ⅲ-3-05: [600, 350]
```

把人類驗收後的邊清單存成 YAML，方便日後 replay 或回滾。
