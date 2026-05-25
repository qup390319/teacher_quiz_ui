# SPEC-14: Admin UI Design System / 管理員後台 UI 設計指南

> 本文件定義管理員後台（`/admin/*`）的 UI 風格。**僅適用於管理員後台**，教師端與學生端仍沿用 `spec-07` 的日系手遊冒險風 / 木框收集冊風。

---

## 1. 為何另立風格

| 維度 | spec-07（教師/學生） | spec-14（管理員） |
|------|----------------------|-------------------|
| 受眾 | 國小教師、五年級學生 | 系統管理者（成人、技術背景） |
| 目的 | 親和、引導、降低使用門檻 | 資訊密度、操作效率、批次處理 |
| 視覺語言 | 木框、irasutoya、Fredoka 字體、立體陰影 | 扁平、薄荷綠、線條 icon、極淡陰影 |
| 字體 | Fredoka + Noto Sans TC | system-ui + Noto Sans TC |

兩套風格**不交叉使用**。管理員後台禁止出現木框/木紋色票；教師端與學生端禁止出現本 spec 的薄荷綠 SaaS 元件。

---

## 2. 色彩 token

```
/* 主色（薄荷綠） */
--admin-primary:        #7DD3A8
--admin-primary-hover:  #5FBF8E
--admin-primary-soft:   #DCFCE7  /* hover bg、active 膠囊底 */
--admin-primary-deep:   #15803D  /* primary 上的字 */

/* 中性 */
--admin-bg-page:        #F4F8F6
--admin-bg-card:        #FFFFFF
--admin-bg-sidebar:     #FFFFFF
--admin-text-primary:   #1F2937
--admin-text-secondary: #4B5563
--admin-text-muted:     #6B7280
--admin-border:         #E5E7EB
--admin-border-strong:  #D1D5DB

/* 狀態（soft pill） */
--admin-success-bg: #DCFCE7   --admin-success-text: #15803D
--admin-warning-bg: #FEF3C7   --admin-warning-text: #B45309
--admin-danger-bg:  #FEE2E2   --admin-danger-text:  #B91C1C
--admin-info-bg:    #DBEAFE   --admin-info-text:    #1E40AF
```

每個值都以 Tailwind arbitrary value (`bg-[#7DD3A8]`) 寫入，不另建 tailwind config（保持與既有專案一致）。

---

## 3. 元件規範

### 3.1 卡片 (Card)
- `bg-white` + `rounded-2xl`（`16px`）或 `rounded-3xl`（`24px`，主要區塊）
- `shadow-sm`（`0 1px 2px rgba(0,0,0,0.04)`）或不設 shadow，改用 `border border-[#E5E7EB]`
- 內距：`p-5` 或 `p-6`

### 3.2 按鈕

**Primary**：
```
bg-[#7DD3A8] hover:bg-[#5FBF8E] text-white font-semibold
rounded-xl px-4 py-2.5 transition-colors
```

**Secondary**：
```
bg-white border border-[#E5E7EB] hover:bg-[#F4F8F6] text-[#1F2937]
rounded-xl px-4 py-2.5
```

**Danger**：
```
bg-[#FEE2E2] hover:bg-[#FECACA] text-[#B91C1C] border border-[#FCA5A5]
rounded-xl px-4 py-2.5
```

### 3.3 Sidebar 項目

**Inactive**：
```
text-[#4B5563] hover:bg-[#F4F8F6] rounded-xl px-3 py-2.5
```

**Active**（薄荷綠膠囊 + 左側 3px 強調條）：
```
bg-[#DCFCE7] text-[#15803D] font-semibold rounded-xl px-3 py-2.5
relative before:absolute before:left-0 before:top-2 before:bottom-2
before:w-1 before:bg-[#15803D] before:rounded-r
```

### 3.4 Status Pill
```
inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
bg-[<status-bg>] text-[<status-text>]
```

### 3.5 Table
- header `bg-[#F4F8F6] text-[#6B7280] uppercase text-xs tracking-wide`
- row hover `hover:bg-[#F4F8F6]`
- divider `divide-y divide-[#E5E7EB]`

### 3.6 Donut Stat Card
參考設計圖中的 `All Leaves` / `Annual Leaves` 卡片：
- 上方左對齊「指標名稱」+ 大數字（`text-3xl font-bold`）+ 小單位
- 右側 Donut（圓環）以薄荷綠填充 + 灰色背景軌
- 卡片整體 `rounded-3xl` + `p-5` + `border border-[#E5E7EB]`

### 3.7 Icons
- 統一用 **Material Symbols Rounded**（與教師端共用，已在 `index.html` 載入）
- 但**不填色**（不加 `filled` class），使用 line-style
- 大小：`text-xl`（sidebar）/ `text-base`（按鈕內）

---

## 4. 版型骨架

```
┌─────────────┬────────────────────────────────────────────┐
│             │  Header（搜尋 + 通知 + admin 頭像 dropdown） │
│             ├────────────────────────────────────────────┤
│  Sidebar    │                                            │
│  (240px)    │  Page content                              │
│             │  - PageHeader（標題 + breadcrumb）          │
│             │  - 統計卡片區（grid）                       │
│             │  - 表格 / 表單                              │
│             │                                            │
└─────────────┴────────────────────────────────────────────┘
```

- Sidebar 寬 `w-60`（240px），背景 `bg-white`，右側細 border
- 頂部 logo 區：`SciLens Admin` + 薄荷綠 dot
- 中間 nav：Dashboard / 帳號管理 / 班級總覽 / 知識節點 / 單元管理 / 範例題庫 / 系統設定
- 底部：登出按鈕 + 當前 admin 名稱

---

## 5. 與既有 spec 的關係

| spec | 影響 |
|------|------|
| spec-02 | 新增 `/admin/login`、`/admin/*` 路由群（由 `<RequireAuth role="admin">` 包起） |
| spec-07 | **互不重疊**。spec-07 仍是教師/學生端唯一風格，spec-14 是管理員後台唯一風格 |
| spec-13 | 共用認證機制與 cookie，但登入入口 `/admin/login` 與 `/`（角色卡頁）獨立 |

---

## 6. 禁止事項（管理員後台限定）

- 禁止使用木框、`from-[#C19A6B]` 系木紋色票、立體厚陰影
- 禁止 irasutoya 卡通插圖
- 禁止 Fredoka 字體（保留給品牌標題即可，內文與 UI 一律 system 字體）
- 禁止圓角超過 `rounded-3xl`（24px）
- 禁止半透明 / glass morphism（影響資訊判讀）
- 禁止在後台引用 spec-07 規範的 `WOOD_OUTER` / `WOOD_INNER_CREAM` 工具 class
