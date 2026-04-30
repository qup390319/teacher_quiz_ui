# SciLens UI 設計風格指南（spec-07）

> **角色定位**：本文件是 SciLens 視覺設計的單一真理來源。實作或修改任何頁面時，**所有共用元件、配色、字體、動畫都必須沿用本文件規範**。
> 若需要新增風格元件，先更新本文件再實作。

---

## 0. 設計理念

### ⚠️ 鐵律：木框只給「可互動元素」用

**這是本設計系統最重要的 UX 原則**：

| 元素類型 | 範例 | 是否套木框 |
|---------|------|-----------|
| **可互動**（按鈕、卡片、可點擊區塊） | 角色卡、GO 按鈕、ⓘ 紐扣 | ✅ 套木框 |
| **資訊性文字**（標題、說明、footer） | 頁面大標、副標、版權資訊 | ❌ 純文字 + 木紋色 |
| **品牌標識**（Logo、Wordmark） | SciLens 字樣 | ❌ 純文字 + 文字陰影 |
| **圖示按鈕**（齒輪、返回、通知） | 設定齒輪 | ❌ 直接用大尺寸 icon/插圖 |

**為什麼**：使用者第一眼要能分辨「哪些可以點」。如果連標題、footer 都包木框，會讓所有元素看起來都像按鈕，反而失去引導性。

**統一規則**：
- 套木框 = 「可以摸的東西」
- 純文字 = 「給你看的資訊」

---



**主軸**：日系手遊冒險風（参考 Cat Game / Animal Crossing / Pokopia）

**情緒目標**：使用者進入系統時感覺像「翻開一本冒險手冊」，而不是「打開一個工具」。

**核心關鍵字**：
- 木框收集冊感（chunky wooden frame + cream paper）
- 角色養成感（avatar + 星等 + Lv 標籤）
- 立體手感（多層複合陰影 + 圓角 + 彈簧曲線互動）
- 自然暖色（藍天綠地背景 + 米色頁面 + 木紋深褐）
- irasutoya 親切插圖風格

**避免**：
- 純粹的 Material Design / 後台儀表板感
- 高對比的扁平卡通（厚黑邊、絲帶 banner）
- 高飽和糖果色 / 過度粒子特效
- 系統 emoji（用 Material Symbols）

---

## 1. 配色系統

> **這套系統取代** spec-06 §3 的 pastel 主題（pastel 仍保留作為知識節點分群色 `NODE_GROUP_COLORS`）。
> Tailwind 4 採用 `bg-[#XXX]` 任意值色彩，所有色票都直接寫色碼。

### 1.1 木框基底色（共用結構元件用）

| 用途 | 色碼 | 說明 |
|------|------|------|
| 木框深褐（漸層下/邊） | `#8B5E3C` | 木框外層下緣、深處 |
| 木框淺褐（漸層上/邊） | `#C19A6B` | 木框外層上緣、亮處 |
| 木框最深陰影 | `#5A3E22` | 立體陰影底色 |
| 米色頁面（漸層下） | `#FBE9C7` | 內層紙感漸層下緣 |
| 米色頁面（漸層上） | `#FFF8E7` | 內層紙感漸層上緣 |
| 米色文字主色 | `#5A3E22` | 在米色底上的標題色 |
| 米色文字次色 | `#7A5232` | 在米色底上的副標 |

### 1.2 角色 / 功能語意色

| 語意 | 主色 | 邊色 | 招牌漸層 | 用途 |
|------|------|------|---------|------|
| 教師 / 出題 / 主功能 | `#5C8A2E`（深綠） | `#7DB044` | `from-[#B8DC83] to-[#7DB044]` | 教師相關卡片、出題流程 |
| 學生 / 互動 / 探索 | `#2E86C1`（深藍） | `#5DADE2` | `from-[#86CEF5] to-[#4A9FD8]` | 學生相關卡片、診斷流程 |
| CTA 教師（橙木） | `#D08B2E` | `#9B5E18` | `from-[#F0B962] to-[#D08B2E]` | 教師端主要按鈕（GO） |
| CTA 學生（水彩天藍） | `#5293B4` | `#3A7397` | `from-[#8AC0D8] to-[#5293B4]` | 學生端主要按鈕（GO）— 降低飽和度與木紋暖色協調 |

### 1.3 強調色（用於警示 / 評分）

| 用途 | 色碼 |
|------|------|
| 黃星 / 重點高亮 | `#F4C545` |
| 黃星陰影 | `rgba(180,120,30,0.5)` |
| 警示 / 錯誤 | `#E74C5E` |
| 成功 | `#76B563` |

### 1.4 背景圖

- **檔案**：`src/assets/backgrounds/bg_chiheisen_green.jpg`（irasutoya 草原藍天）
- **使用方式**：所有 Layout 容器級頁面（首頁、Dashboard、各功能首頁）皆建議套用此底圖
- **覆蓋層**：通常不需要，木框元件自身已具足夠對比；若文字直接在 bg 上才考慮加 `bg-white/30 backdrop-blur` 半透明層

---

## 2. 字體系統

### 2.1 載入

`index.html` 已載入：

```html
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Fredoka:wght@500;600;700&display=swap" />
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&display=swap" />
```

### 2.2 使用規則

| 內容類型 | 字體 | Tailwind class |
|---------|------|---------------|
| 中文（一般） | Noto Sans TC | （預設，無需指定） |
| 中文（標題粗黑） | Noto Sans TC weight 900 | `font-black` |
| **英文 / 數字（裝飾、標題）** | **Fredoka** | **`font-game`**（自訂 class，定義於 `src/index.css`） |
| 系統 icon | Material Symbols Rounded | `material-symbols-rounded` 或 `<Icon />` 元件 |

### 2.3 標題層級

| 層級 | 範例 | 規格 |
|------|------|------|
| 頁面大標 | 「迷思概念診斷」 | `font-game text-3xl sm:text-4xl font-bold text-[#5A3E22]` |
| 卡片標題 | 「我是老師」（招牌內） | `font-game text-base font-bold` |
| 副標 | 「以『水溶液』單元為例」 | `text-sm sm:text-base font-bold text-[#7A5232]` |
| CTA 按鈕字 | 「GO」 | `font-game text-2xl font-bold tracking-wider` + `drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]` |
| 內文 | 副標、說明 | `text-sm font-medium text-[#7A5232]` |
| 小字資訊 | footer、tooltip | `text-xs text-[#5A3E22]` |

---

## 3. 木框元件規範（最重要）

> **核心模式**：所有結構性容器（卡片、按鈕、彈窗、徽章）都遵循「**外木框 + 內米紙**」雙層結構。

### 3.1 共用 class 常數（必須引用，禁止複製貼上重定義）

定義於使用木框的頁面內（首先在 `LoginPage.jsx`），未來若多頁使用可抽到 `src/constants/uiTokens.js`：

```jsx
// 外層深褐木紋邊（雙層漸層 + 立體複合陰影）
const WOOD_OUTER =
  'bg-gradient-to-b from-[#C19A6B] to-[#8B5E3C] p-[5px] rounded-[28px] ' +
  'shadow-[0_6px_0_-1px_#5A3E22,0_14px_24px_-6px_rgba(91,66,38,0.45)]';

// 內層米色紙感頁面
const WOOD_INNER_CREAM =
  'bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7] rounded-[22px] border-2 border-[#FFFFFF]/70';
```

**使用範例**：
```jsx
<div className={WOOD_OUTER}>
  <div className={WOOD_INNER_CREAM + ' p-4'}>
    {/* 內容 */}
  </div>
</div>
```

### 3.2 圓角規範

| 元件 | 外圓角 | 內圓角 | 備註 |
|------|--------|--------|------|
| 標準卡片 / 按鈕 | `rounded-[28px]` | `rounded-[22px]` | 內外差 6px = padding 5px + 邊 1px |
| 大型卡片（角色卡） | `rounded-[28px]` | `rounded-[22px]` | 同上 |
| 小型 pill / icon 按鈕 | `rounded-full` | `rounded-full` | 圓形 |
| 中型徽章（標題木牌） | `rounded-[28px]` | `rounded-[22px]` | 同標準 |
| 角色頭像方框 | `rounded-2xl`(16px) | — | 單層 |

### 3.3 陰影系統（立體複合陰影）

> **規則**：陰影分為「下沉硬影（color stop）」+「擴散柔影（rgba blur）」兩層，模擬實體厚度。

| 用途 | shadow 規格 |
|------|-------------|
| 木框外殼（最常用） | `shadow-[0_6px_0_-1px_#5A3E22,0_14px_24px_-6px_rgba(91,66,38,0.45)]` |
| 招牌（小） | `shadow-[0_3px_0_-1px_rgba(0,0,0,0.25),0_5px_8px_-3px_rgba(0,0,0,0.3)]` |
| CTA 按鈕（教師橙） | `shadow-[0_5px_0_#9B5E18,0_8px_14px_-3px_rgba(155,94,24,0.5)]` |
| CTA 按鈕（學生藍） | `shadow-[0_5px_0_#1F618D,0_8px_14px_-3px_rgba(31,97,141,0.5)]` |
| 內陰影（頭像方框內凹） | `shadow-[inset_0_-4px_0_rgba(0,0,0,0.08),0_4px_0_-1px_rgba(0,0,0,0.15)]` |
| ⓘ 紐扣 | `shadow-[0_3px_0_-1px_#5A3E22,0_5px_8px_-2px_rgba(0,0,0,0.3)]` |

**禁止使用**：
- ❌ 單層柔模糊陰影 `shadow-md` / `shadow-lg`（太軟，缺立體感）
- ❌ 純偏移硬陰影 `shadow-[8px_8px_0_#XXX]`（之前 sticker 風的舊式，已淘汰）

---

## 4. 元件規範

### 4.1 卡片內標題（純文字 + icon）

> **設計決策（2026-04-29 後）**：木框卡片內的角色 / 區塊標題使用**純文字 + Material Symbols icon**，不要用色塊招牌。
> 原因：色塊招牌（綠/藍漸層）與木框米紙暖色系視覺衝突，破壞統一感；且色塊用 `-mt-10` 突出時容易被父層 `overflow-hidden` 裁切。

```jsx
// 木框卡片內的角色 / 區塊標題（推薦用法）
<h2 className="text-center mb-3 text-[#5A3E22] font-black text-2xl tracking-wide drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
  我是老師
</h2>
```

**色彩**：標題使用木紋暖色（`#5A3E22`），不要用綠/藍。
**字體大小**：`text-2xl font-black`（要顯眼，是卡片主標）。
**文字陰影**：`drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]` 添加微立體感，呼應木紋色系。
**禁止**：標題前加 emoji 或 Material Symbols icon — 純文字最乾淨，角色識別交給插圖與 CTA 按鈕色處理。
**角色識別**：透過 CTA 按鈕色（教師橙 / 學生藍）+ 角色插圖（irasutoya）區分，不需色塊背景或前綴 icon。

### 4.1c 卡片內角色插圖（無方框，直接呈現）

> **設計決策（2026-04-29）**：irasutoya 角色插圖直接放在木框米紙上，**不要**用漸層方框 + 4 角小釘包裝（容易視覺擁擠 + 與插圖風格脫節）。

```jsx
<div className="flex justify-center items-end h-32 mb-3">
  <img
    src={teacherImg}
    alt="老師"
    className="max-h-32 object-contain
               group-hover:scale-110
               transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
               drop-shadow-[0_4px_4px_rgba(91,66,38,0.25)]"
  />
</div>
```

**重點**：
- `drop-shadow-[0_4px_4px_rgba(91,66,38,0.25)]` 模擬「站在地面投影」感，讓插圖浮起
- hover 加 `scale-110` + `-rotate-3` + 彈簧曲線，角色微傾「歡迎」感
- `items-end` + 固定容器高度 `h-32`，讓不同插圖高度都對齊底部

### 4.1b 招牌 SignBoard（保留元件，僅用於特殊場景）

```jsx
// 仍可用，但僅限：頁面區塊大型 banner、需要強烈色彩識別的功能標題
const SignBoard = ({ children, color = 'green' }) => {
  const palette = color === 'green'
    ? 'bg-gradient-to-b from-[#B8DC83] to-[#7DB044] text-[#2F4A1A] border-[#5C8A2E]'
    : 'bg-gradient-to-b from-[#86CEF5] to-[#4A9FD8] text-[#1A3A5C] border-[#2E6FA0]';
  return (
    <div className={`relative inline-flex items-center justify-center px-5 py-1.5 rounded-full border-2 ${palette}
                     shadow-[0_3px_0_-1px_rgba(0,0,0,0.25),0_5px_8px_-3px_rgba(0,0,0,0.3)]
                     font-game text-base font-bold tracking-wide`}>
      {children}
    </div>
  );
};
```

**何時用**：
- ✅ 頁面分區大標題（例如「📊 班級診斷結果」獨立區塊）
- ✅ 流程進度節點的當前步驟強調
- ❌ **不要**用於木框卡片內標題（用純文字 + icon 即可）
- ❌ **不要**配 `overflow-hidden` 父容器 + 負 margin 突出技巧（會被裁切）

### 4.2 三星評等 StarRating

```jsx
const StarRating = ({ count = 3, max = 3 }) => (
  <div className="inline-flex items-center gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Icon key={i} name="star" filled
        className={`text-xl drop-shadow-[0_2px_0_rgba(180,120,30,0.5)] ${
          i < count ? 'text-[#F4C545]' : 'text-[#D8C7A0]'}`} />
    ))}
  </div>
);
```

**用法情境**：角色卡、成就、學習進度（達標度）。

### 4.3 主要 CTA 按鈕（GO 按鈕）

**規格**：肥大圓角膠囊 + 漸層底 + 深色邊 + 立體複合陰影 + 大字 + `play_arrow` icon

```jsx
// 教師（橙木）
<div className="relative flex items-center justify-center gap-1.5 bg-gradient-to-b from-[#F0B962] to-[#D08B2E]
                text-white py-3 rounded-full border-2 border-[#9B5E18]
                shadow-[0_5px_0_#9B5E18,0_8px_14px_-3px_rgba(155,94,24,0.5)]
                group-hover:shadow-[0_3px_0_#9B5E18] group-hover:translate-y-0.5
                transition-all duration-200">
  <span className="font-game text-2xl font-bold tracking-wider drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">GO</span>
  <Icon name="play_arrow" filled className="text-2xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)] group-hover:translate-x-1 transition-transform" />
</div>

// 學生（水彩天藍）：from-[#8AC0D8] to-[#5293B4]、border-[#3A7397]、shadow #3A7397
```

**互動**：hover 時陰影縮短（從 5px → 3px）+ 按鈕往下沉 0.5（`translate-y-0.5`），模擬「按下去」感。

**何時用**：頁面唯一的主要動作（進入、開始、提交）。**一頁只放 1~2 個 GO 按鈕**，避免氾濫。

### 4.4 ⓘ 圓木紐扣（次要資訊觸發）

**規格**：圓形米色木框 + `info` icon + 立體陰影 + click-toggle popover

```jsx
<button
  type="button"
  aria-label="顯示功能說明"
  aria-expanded={open}
  onClick={(e) => { e.stopPropagation(); onToggleInfo(); }}
  className={`absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full
             bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
             border-[3px] border-[#8B5E3C] text-[#7A4A18]
             flex items-center justify-center
             shadow-[0_3px_0_-1px_#5A3E22,0_5px_8px_-2px_rgba(0,0,0,0.3)]
             hover:scale-110 hover:rotate-12 hover:bg-[#FFF4E0]
             transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
             ${open ? 'rotate-12 scale-110' : ''}`}
>
  <Icon name="info" filled className="text-xl" />
</button>
```

**互動模式**：**只用 click 觸發**（不要 hover），相容桌面 + 行動裝置。配合 `useEffect` 監聽 `mousedown` 實作 click-outside 關閉。

> ⚠️ **重要設計原則：次要元件不要套角色色**
>
> ⓘ 紐扣、popover 文字、popover bullet、icon 等**次要 / 輔助元件**統一使用木紋色（`#7A4A18` / `#5A3E22` / `#D08B2E`），**不要**因為所在卡片是教師（綠/橙）或學生（藍）就跟著變色。
>
> **理由**：次要元件只是「翻一下看細節」用，不是視覺重點。套角色色會搶走 CTA 按鈕的視覺焦點，且木紋色更能呼應「冒險手冊」的暖色調統一感。
>
> **角色色僅保留給**：CTA「GO」按鈕、角色頭像背景（如有）。其餘元件一律木紋色。

### 4.5 Popover（功能說明 / 次要資訊）

```jsx
{open && (
  <div role="tooltip" className={`absolute top-12 right-0 z-20 w-64 ${WOOD_OUTER} animate-fade-up`}>
    <div className={`${WOOD_INNER_CREAM} p-4`}>
      {/* 木紋小三角箭頭 */}
      <div className="absolute -top-2 right-6 w-4 h-4 bg-[#C19A6B] rotate-45 rounded-sm" />
      {/* 標題（木紋色） */}
      <div className="text-xs font-bold text-[#5A3E22] mb-3 flex items-center gap-1">
        <Icon name="menu_book" filled className="text-base" />
        標題
      </div>
      {/* 條目（木紋色文字 + 金棕 bullet） */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-sm text-[#5A3E22]">
            <Icon name={item.icon} className="text-[#D08B2E] text-lg" filled />
            {item.text}
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

**色彩**（無論所在卡片是哪個角色，皆使用統一木紋色）：
- 標題、條目文字：`text-[#5A3E22]`
- 箭頭：`bg-[#C19A6B]`
- Bullet icon：`text-[#D08B2E]`

### 4.6 頂部狀態列（手遊風）

每個主畫面建議都有頂部狀態列，左邊放品牌/吉祥物，右邊放設定/通知。

```jsx
<div className="flex items-center justify-between mb-4 sm:mb-6">
  {/* 左：品牌 */}
  <div className="flex items-center gap-2">
    <div className={WOOD_OUTER + ' animate-breath'}>
      <div className={WOOD_INNER_CREAM + ' w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden'}>
        <img src={heroImg} alt="吉祥物" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
      </div>
    </div>
    <div className={WOOD_OUTER}>
      <div className={WOOD_INNER_CREAM + ' px-3 sm:px-4 py-2 flex items-center gap-1.5'}>
        <Icon name="science" filled className="text-[#5C8A2E] text-xl" />
        <span className="font-game font-bold text-[#5A3E22] text-base sm:text-lg">SciLens</span>
      </div>
    </div>
  </div>

  {/* 右：木質齒輪設定按鈕（無外框，純 icon） */}
  <button
    type="button"
    aria-label="設定"
    className="text-[#8B5E3C] hover:text-[#6B4423] hover:rotate-90 hover:scale-110
               transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
               drop-shadow-[0_3px_0_#5A3E22] cursor-pointer
               flex items-center justify-center"
  >
    <Icon name="settings" filled className="text-[64px] sm:text-[72px] leading-none" />
  </button>
</div>
```

**設計準則**：
- **小型 icon 按鈕（齒輪、返回、通知等）不要包木框**，直接用大尺寸 Material Symbols + 木紋色 + 立體 drop-shadow 即可
- 木紋色：`text-[#8B5E3C]`（主）/ `text-[#6B4423]`（hover 加深）
- 立體陰影：`drop-shadow-[0_3px_0_#5A3E22]` 模擬「實體木雕」感
- hover 互動：旋轉（齒輪 90°）+ scale 110% + 彈簧曲線
- 大小：`text-[64px] sm:text-[72px]` 讓 icon 本身有足夠視覺重量

---

## 5. 圖示規範

### 5.1 Material Symbols Rounded（首選 icon 系統）

**Icon 包裝元件**（每個頁面引用）：
```jsx
const Icon = ({ name, className = '', filled = false }) => (
  <span className={`material-symbols-rounded${filled ? ' filled' : ''} ${className}`}>{name}</span>
);
```

**使用慣例**：
- 內容 / 強調 icon → `filled` 版本（圓潤可愛感）
- 純結構符號（箭頭、選單）→ outlined（預設）
- 顏色：用 Tailwind `text-[#XXX]` 控制
- 大小：用 `text-xl` / `text-2xl` 等控制

### 5.2 常用 icon 對照表

| 用途 | icon name |
|------|-----------|
| 系統 / 科學 | `science` |
| 學校 / 班級 | `school` |
| 學生 / 書包 | `backpack` |
| 設定 | `settings` |
| 資訊 | `info` |
| 提示 / 燈泡 | `tips_and_updates` |
| 出題 / 魔法 | `auto_fix_high` |
| 啟動 / 推薦 | `rocket_launch` |
| 圖表 / 洞察 | `insights` |
| 對話 | `forum` |
| 探索 | `explore` |
| 健康檢查 | `monitor_heart` |
| 知識圖 | `account_tree` |
| 主功能標題 | `menu_book` |
| 評等 | `star` |
| GO 箭頭 | `play_arrow` |
| 完成 | `check_circle` |
| 葉子（裝飾） | `eco` |
| 花（裝飾） | `local_florist` |

**禁止**：系統 emoji（💧🧪😀），會在不同平台渲染不一致。

### 5.3 irasutoya 插圖

**目錄**：`src/assets/illustrations/`

**已下載素材**：
- `irasutoya_hero.png` — 戴口罩混藥小科學家（吉祥物 / 載入畫面）
- `irasutoya_teacher.png` — 戴眼鏡持試管的男老師
- `irasutoya_student_boy.png` — 看燒杯的男學生（笑臉）
- `irasutoya_student_girl.png` — 看燒杯的女學生（笑臉）

**新插圖取得規則**：
- 主動到 https://www.irasutoya.com/ 搜尋並下載（agent 可自行抓取）
- 命名：`irasutoya_<主題>_<描述>.png`
- 解析度：建議 `s800` 以上
- 風格須與既有素材協調（同為 irasutoya 風格）

**何時用插圖 vs icon**：
- 角色 / 場景 / 大型視覺主體 → 用 irasutoya 插圖
- 小型功能標示 / 結構性符號 → 用 Material Symbols
- 同一畫面避免 icon 與插圖混用於相同層級

---

## 6. 動畫規範

### 6.1 已定義動畫（`src/index.css`）

| class | 用途 |
|-------|------|
| `animate-fade-up` | 元素載入淡入上滑（0.6s） |
| `animate-fade-up-delay-1/2/3` | stagger 載入（依序延遲 0.15s / 0.30s / 0.45s） |
| `animate-float` | 上下飄浮（4s） |
| `animate-float-slow` | 慢飄浮（6s） |
| `animate-wiggle` | 左右搖擺（3s） |
| `animate-pulse-soft` | 心跳脈衝（2.4s） |
| `animate-breath` | 呼吸縮放（3s） — 適合吉祥物、Logo |
| `animate-jelly` | Q 彈果凍（一次性，hover 用） |
| `animate-leaf-sway` | 葉子搖擺（5s） |
| `animate-cloud-drift` | 雲朵橫向飄移（12s） |

### 6.2 互動曲線（重要）

**所有 hover / 點擊互動皆使用彈簧曲線**，不要用線性或預設 ease：

```css
ease-[cubic-bezier(0.34,1.56,0.64,1)]
```

**Tailwind 寫法**：`transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]`

### 6.3 標準互動 pattern

| 互動 | 規格 |
|------|------|
| 卡片 hover | `hover:-translate-y-1 hover:scale-[1.02]` + 彈簧曲線 |
| 主按鈕 hover | 陰影縮短 + `translate-y-0.5`（按下感） |
| icon 按鈕 hover | `hover:scale-110 hover:rotate-12` |
| 齒輪 hover | `hover:rotate-45 transition-transform duration-500` |
| 角色頭像 hover | 角色 `scale-110`、學生雙人微分開 |

### 6.4 載入動畫 stagger

頁面區塊依重要性順序載入：

```jsx
<div className="animate-fade-up">{/* 頂部狀態列 */}</div>
<div className="animate-fade-up">{/* 主標題 */}</div>
<div className="animate-fade-up-delay-1">{/* 主卡片 1 */}</div>
<div className="animate-fade-up-delay-2">{/* 主卡片 2 */}</div>
<div className="animate-fade-up-delay-3">{/* 底部資訊 */}</div>
```

---

## 7. 間距與佈局

### 7.1 容器最大寬度

| 用途 | max-width |
|------|-----------|
| 角色 / 卡片並排（2 個） | `max-w-2xl`（672px） |
| 內容主區（3 個卡片） | `max-w-3xl`（768px） |
| Dashboard 全寬 | `max-w-7xl`（1280px） |

### 7.2 Padding / Gap

| 元件 | 內 padding | 子元素 gap |
|------|-----------|-----------|
| 主卡片內米紙 | `px-5 pt-6 pb-5` | — |
| 卡片間 | — | `gap-4 sm:gap-5` |
| 頂部 status bar | `mb-4 sm:mb-6` | `gap-2` |
| 頁面整體 | `p-4 sm:p-6` | — |

### 7.3 RWD 斷點

統一使用 Tailwind 預設：
- **預設**：mobile（< 640px），所有元素堆疊垂直
- **`sm:`**：tablet（≥ 640px），開始水平排列
- **`md:`**：（≥ 768px），更多 padding
- **`lg:`**：desktop（≥ 1024px）

---

## 8. 套用到新頁面的 Checklist

當你要為 SciLens 新頁面（例如 `TeacherDashboard`、`StudentHome`）套用本設計風格時，依序執行：

### Step 1：版面結構
- [ ] 頁面最外層套用 `bg_chiheisen_green.jpg` 為背景（或共用 Layout 統一處理）
- [ ] 頂部加狀態列：左品牌（吉祥物 + Logo pill）、右設定/通知
- [ ] 主內容區置中、最大寬度限制

### Step 2：色彩
- [ ] 教師相關區域 → 綠系（招牌綠 + 橙木 CTA）
- [ ] 學生相關區域 → 藍系（招牌藍 + 藍 CTA）
- [ ] 標題用木框米紙 + Fredoka 大字
- [ ] **禁止**用 spec-06 §3 舊版 pastel 色當主視覺色（pastel 只保留給知識節點分群）

### Step 3：元件選用
- [ ] 任何容器卡片 → `WOOD_OUTER` + `WOOD_INNER_CREAM` 雙層結構
- [ ] 區塊標題 → `SignBoard`（綠/藍）
- [ ] 評等 / 進度 → `StarRating`
- [ ] 主動作 → GO 按鈕（橙木 / 藍）
- [ ] 次要資訊 → `ⓘ` 圓木紐扣 + popover

### Step 4：字體
- [ ] 中文標題 / 內文 → Noto Sans TC
- [ ] 英文 / 數字 / 裝飾字 → `font-game`（Fredoka）
- [ ] icon → Material Symbols Rounded（filled 版本為主）

### Step 5：互動
- [ ] 所有 transition 加 `ease-[cubic-bezier(0.34,1.56,0.64,1)]`
- [ ] 卡片 hover 加 `scale-[1.02] -translate-y-1`
- [ ] 按鈕 hover 加「按下沉」效果
- [ ] 頁面載入用 `animate-fade-up` stagger

### Step 6：素材
- [ ] icon → Material Symbols（不准用 emoji）
- [ ] 角色 / 大型插圖 → irasutoya 風格（沒有就到 irasutoya.com 抓）

### Step 7：驗證
- [ ] `npm run lint` 通過
- [ ] `npm run build` 通過
- [ ] 在 dev server 截圖檢視視覺
- [ ] 同步更新 `docs/spec-02-routes-and-pages.md` 對應頁面的視覺描述

---

## 9. 範例參考

**最完整的實作範例**：`src/pages/LoginPage.jsx` — 包含本文件所有元件、配色、動畫、結構

**新頁面實作時**：
1. 從 `LoginPage.jsx` 複製 `Icon`、`SignBoard`、`StarRating`、`WOOD_OUTER`、`WOOD_INNER_CREAM` 五個常數/元件
2. 若多頁複用，**抽到共用檔案**（建議 `src/components/ui/woodKit.jsx`），避免散落維護困難
3. 依本文件 Step 1~7 套用

---

## 11. 學生端任務看板元件（StudentHome 專用）

> **設計決策（2026-04-29）**：學生端首頁採用「任務看板」（mission board / quest log）隱喻 — 垂直分區任務列表，每個派題是一張獨立任務卡。
>
> **棄用：闖關地圖路徑**（v2.1 短暫嘗試後棄用）。**棄用原因**：派題之間沒有先後順序（老師可能同時派多份）、截止時間會變動，「曲線路徑」隱含的依賴順序與線性進度感誤導學生。任務看板更貼合「平行派題」的系統本質。

### 11.1 共用元件入口

| 元件 | 檔案 | 用途 |
|------|------|------|
| `Icon` / `WOOD_OUTER` / `WOOD_INNER_CREAM` / `SignBoard` / `StarRating` / `GoButton` / `WoodIconButton` | `src/components/ui/woodKit.jsx` | 跨頁面共用木框風格基礎元件，所有頁面 import 此檔 |
| `TaskCard` | `src/components/student/TaskCard.jsx` | 橫向任務卡（4 種狀態） |

### 11.2 TaskCard 狀態色票（v2.4 - 寶可夢手遊風）

> **設計決策（2026-04-29）**：TaskCard 採用**白底 + 厚棕邊 + 卡底彩色 band** 結構，視覺呼應 Pokemon Trainer Rank 升級畫面：清楚的卡片邊界 + 大圖示 + 大標題 + 進度條 + chunky upgrade 按鈕。
>
> **棄用 v2.3** 的「彩色背景 + 細邊」：v2.3 任務卡視覺權重不夠，標題不夠突出，列表不夠清楚。

| 狀態 | 圖示框 | 圖示色 | 徽章 icon | 卡底 band | 進度條填充色 | 備註 |
|------|-------|-------|----------|----------|------------|------|
| `next` | bg `#FFF1D8` border `#F0B962` | `text-[#D08B2E]` | `quiz` | 綠 (`from-[#C8E4A8] to-[#A8D88E]`) | 橘黃 | 未完成且未過期主要狀態 |
| `completed` | bg `#E8F4D8` border `#7DB044` | `text-[#5C8A2E]` | `verified` | 深綠 | 綠 | 顯示 `StarRating` + 答對題數 |
| `expired` | bg `#F0EAE2` border `#9B8E80` | `text-[#7A6F60]` | `schedule` | 灰 | 灰 | 整卡 `opacity-90`，CTA 用 muted 灰按鈕 |

**設計準則**：
- 三種狀態都使用**相同卡片殼**（白底 + 厚棕邊），差異僅在「圖示框配色 + 卡底 band 配色 + 圖示」
- **不採用「鎖頭」設計**：派題不是闖關前置條件
- 進度條的 width 由「答對率」決定（已完成才有填充，其他為 0%）

### 11.3 任務卡結構（v2.4 範本）

```jsx
<div className="relative bg-white border-[3px] border-[#8B5E3C] rounded-[20px] overflow-hidden
               shadow-[0_4px_0_-1px_#5A3E22,0_8px_14px_-4px_rgba(91,66,38,0.35)]">
  {/* 左上角貼紙（緊急 / 完成 / 過期） */}
  <Sticker variant="urgent | completed | expired" text="..." />

  <div className="flex items-center gap-3 p-3 sm:p-4">
    {/* 左：大圖示方框 (w-16 sm:w-20) */}
    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${iconBg} border-2 ${iconBorder}
                    flex items-center justify-center
                    shadow-[inset_0_-3px_0_rgba(0,0,0,0.06),0_2px_4px_rgba(91,66,38,0.15)]`}>
      <Icon name={icon} filled className={`text-4xl sm:text-5xl ${iconColor}`} />
    </div>

    {/* 中：標題（粗黑大字） + 進度條 + 副資訊 */}
    <div className="flex-1 min-w-0 leading-tight">
      <h3 className="font-black text-base sm:text-lg text-[#5A3E22] mb-1.5 truncate">{title}</h3>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs sm:text-sm font-bold text-[#5A3E22]">{questionCount} 題</span>
        <div className="flex-1 h-2.5 sm:h-3 bg-[#E0D5BC] rounded-full overflow-hidden border border-[#8B5E3C]/40">
          <div className={`h-full ${progressFill}`} style={{ width: `${progressPct}%` }} />
        </div>
        {isCompleted && <StarRating count={stars} size="text-sm" />}
      </div>
      <p className="text-xs sm:text-sm text-[#7A5232] font-medium">截止：5 月 4 日</p>
    </div>

    {/* 右：厚黃 chunky 按鈕（已完成則上下雙按鈕） */}
    <ChunkyButton variant="primary" label="開始" icon="play_arrow" />
  </div>

  {/* 卡底彩色 band */}
  <div className={`h-2 sm:h-2.5 ${bandClass}`} />
</div>
```

### 11.4 ChunkyButton 規格（v2.4）

> 取代 v2.3 的學生藍 GO 按鈕。視覺權重對齊參考圖的 chunky upgrade 按鈕。

| variant | 用途 | 配色 | 陰影 |
|---------|------|------|------|
| `primary` | 主要 CTA（開始 / 查看） | `from-[#F4D58A] to-[#F0B962]` + `border-[#9B5E18]` | `0_4px_0_#9B5E18` 硬陰影 + 柔陰影 |
| `muted` | 過期狀態 CTA | `from-[#D0C5B8] to-[#9B8E80]` + `border-[#6B5E50]` | `0_4px_0_#6B5E50` |
| `ghost` | 次要按鈕（再做） | `bg-white border-[#8B5E3C]` text 棕色 | `0_2px_0_#8B5E3C`（薄） |

```jsx
<button className="border-[3px] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5
                  font-game font-black tracking-wider text-sm sm:text-base
                  hover:translate-y-0.5 transition-all duration-200">
  <span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">開始</span>
  <Icon name="play_arrow" filled />
</button>
```

### 11.5 Sticker 貼紙（v2.4）

> 浮於任務卡左上角邊界外，模擬手遊「GET / NEW / 完成」貼紙風格。

| variant | 配色 | icon | 動畫 |
|---------|------|------|------|
| `urgent` | 紅漸層 (`from-[#F08080] to-[#D54545]`) + 白邊 | `alarm` | `animate-pulse-soft` |
| `completed` | 綠漸層 (`from-[#A8D88E] to-[#5C8A2E]`) + 白邊 | `check` | — |
| `expired` | 灰漸層 (`from-[#C0B4A6] to-[#7A6F60]`) + 白邊 | `block` | — |

```jsx
<div className="absolute -top-1.5 -left-1.5 z-10 inline-flex items-center gap-0.5 px-2 py-0.5
                rounded-md border-2 text-[10px] sm:text-xs font-game font-black tracking-wider
                shadow-[0_2px_4px_rgba(0,0,0,0.3)] -rotate-6 ...">
  <Icon name={icon} filled className="text-xs" />
  {text}
</div>
```

**設計重點**：
- 微旋轉 -6° → 模擬「實體貼紙黏歪」感
- 浮於卡片左上邊界外（`-top-1.5 -left-1.5`），打破矩形增加趣味
- 紅色 / 綠色 / 灰色三 variant 對應緊急 / 完成 / 過期

### 11.5 TaskSection 折疊區塊

```jsx
// 「已完成任務」預設折疊；標題列即觸發按鈕
<button type="button" onClick={onToggle} aria-expanded={open}
        className="flex items-center gap-2 mb-3 cursor-pointer select-none w-full">
  <Icon name="check_circle" filled className="text-2xl text-[#5C8A2E]" />
  <h2 className="font-game text-lg sm:text-xl font-black text-[#5A3E22]">已完成任務</h2>
  {/* 數量徽章：米色木框圓 pill */}
  <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 h-6 rounded-full
                   bg-[#FFF4E0] border-2 border-[#8B5E3C] text-[#7A4A18] text-xs font-bold
                   shadow-[0_2px_0_-1px_#5A3E22]">{count}</span>
  <Icon name="expand_more" filled
        className={`ml-auto text-2xl text-[#7A5232] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
</button>
```

**設計準則**：
- 「待挑戰」永遠展開（核心焦點）
- 「已完成」預設折疊（避免長列表干擾）
- 區塊標題列本身是 toggle 觸發鈕，整列可點

### 11.6 StatPill（學生端進度指標）

> **核心原則**：用**診斷系統的真實學習進度**，而非「連勝 / EXP / 寶石」這類純遊戲化指標。

| Pill | icon | 計算 | 強調色 |
|------|------|------|--------|
| 已完成診斷 | `assignment_turned_in` | `studentHistory` 對應派題的完成數 / 該班派題總數 | `text-[#5C8A2E]` |
| 已探索概念 | `account_tree` | `studentHistory` 中答對題目涵蓋的不同 `knowledgeNodeId` 數 / 12 | `text-[#2E86C1]` |
| 待完成派題 | `pending_actions` | 該班派題中尚未在 history 出現的數量 | `text-[#D08B2E]` |

```jsx
<div className={WOOD_OUTER}>
  <div className={`${WOOD_INNER_CREAM} px-3 sm:px-4 py-2 flex items-center gap-2`}>
    <Icon name={icon} filled className={`text-xl ${accent}`} />
    <div className="leading-tight">
      <p className="text-[10px] sm:text-xs font-bold text-[#7A5232]">{label}</p>
      <p className="font-game text-base sm:text-lg font-black text-[#5A3E22]">{value}</p>
    </div>
  </div>
</div>
```

---

## 12. 治療對話頁元件（ScenarioChat 專用，spec-08）

> **設計決策（2026-04-29）**：治療模組對話頁完全沿用本文件木框收集冊風，**不採用** eh 系統的 Duolingo 暗色風格（綠色填充進度條、暗色背景、貓頭鷹 GIF、書本翻頁反思）。
>
> 視覺主軸：保持 SciLens 「翻開冒險手冊」的暖色調統一感，治療場景要與診斷場景視覺呼應（同一系列）。

### 12.1 治療任務 vs 診斷任務的色相區隔

兩種派題卡片使用相同 `TaskCard` 結構，靠**卡底 band 色**區隔：

| 派題類型 | 卡底 band 色（next 狀態） | 圖示 |
|---------|--------------------------|------|
| `diagnosis` | 綠 (`from-[#C8E4A8] to-[#A8D88E]`) — 既有 | `quiz` |
| `scenario` | 青木綠 (`from-[#A8D8C8] to-[#5BA47A]`) — 新增 | `forum`（對話 icon） |

加左上角 chip：
- 診斷：橙底「📝 診斷」（沿用既有橙木）
- 治療：青木底「🌱 治療」

### 12.2 進度條（WoodenProgressBar）

**禁止使用 Duolingo 綠**（`#58CC02`）。改用木框風：

```jsx
// 木框外殼
<div className="bg-gradient-to-b from-[#C19A6B] to-[#8B5E3C] p-[3px] rounded-full
                shadow-[0_3px_0_-1px_#5A3E22,0_4px_8px_-2px_rgba(91,66,38,0.3)]">
  {/* 內層米色軌道 + 教師綠填充 */}
  <div className="bg-[#FBE9C7] rounded-full overflow-hidden h-3">
    <div
      className="h-full bg-gradient-to-b from-[#A8D88E] to-[#5C8A2E]
                 transition-[width] duration-500 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
</div>
```

**規格**：
- 木紋邊（外層）+ 米色軌道（內層）+ 教師綠填充
- 高度 `h-3`，圓角 `rounded-full`
- 進度跳動時加 `+N` 浮字（用 `font-game text-[#5C8A2E]`），**禁用** Duolingo 樣式

### 12.3 對話氣泡

| 角色 | 配色 | 結構 |
|------|------|------|
| AI（吉祥物） | 米紙底 + 木紋邊 | `bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7] border-2 border-[#C19A6B] rounded-2xl rounded-bl-md` |
| 學生 | 學生綠（呼應 spec-07 §1.2 的學生綠/藍系） | `bg-gradient-to-b from-[#B8DC83] to-[#7DB044] border-2 border-[#5C8A2E] text-[#2F4A1A] rounded-2xl rounded-br-md` |

文字大小：`text-sm sm:text-base leading-relaxed`，padding `px-4 py-3`。
**禁止**：暗色（eh 風格）`bg-white/15` 半透明氣泡。

### 12.4 吉祥物提示泡泡（MascotHintBubble）

固定於右下角（input bar 上方）。

```jsx
<div className="fixed bottom-[88px] right-3 z-20 pointer-events-none">
  <div className="relative">
    {/* 對話泡泡：米紙 + 木紋邊 */}
    <div className="absolute bottom-full left-0 mb-2 min-w-[160px] max-w-[220px]
                    rounded-[20px] bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                    border-2 border-[#C19A6B] px-4 py-3
                    shadow-[0_4px_0_-1px_#5A3E22,0_6px_10px_-3px_rgba(91,66,38,0.4)]">
      {/* 向下尖角，左側 */}
      <div className="absolute bottom-[-7px] left-6 h-3 w-3 rotate-45
                      bg-[#FBE9C7] border-b-2 border-r-2 border-[#C19A6B]" />
      <p className="text-sm font-bold leading-6 text-[#5A3E22]">{feedback}</p>
    </div>
    {/* 吉祥物圖（用 scilens_mascot.png 或 irasutoya_hero.png） */}
    <img src={mascotImg} alt="吉祥物" className="h-16 w-16 object-contain
                drop-shadow-[0_4px_4px_rgba(91,66,38,0.3)]" />
  </div>
</div>
```

**禁用**：eh 系統的 owl GIF（`owl_intro.gif`），改用 SciLens 既有 `scilens_mascot.png`。

### 12.5 結算過關木牌（CompletionWoodenSign）

**禁止**：eh 的「過關成功」黃色卡片 + completion_monster.gif。

改用 SciLens 木框 + StarRating：

```jsx
<div className={WOOD_OUTER + ' max-w-md'}>
  <div className={WOOD_INNER_CREAM + ' p-6 text-center'}>
    {/* 大標題 */}
    <h2 className="font-game text-3xl font-black text-[#5A3E22] mb-3
                   drop-shadow-[0_2px_0_rgba(193,154,107,0.4)]">
      過關成功
    </h2>
    {/* StarRating（依答對 stage 決定 1~3 星） */}
    <div className="flex justify-center mb-4"><StarRating count={stars} /></div>
    {/* 內文 */}
    <p className="text-sm text-[#7A5232] leading-relaxed mb-5">
      你已經完成這次治療對話，接下來進入反思…
    </p>
    {/* 主 CTA：學生綠 GO 按鈕 */}
    <ChunkyButton variant="primary" label="進入反思" icon="play_arrow" />
  </div>
</div>
```

**評等規則（建議）**：
- 全部題目達 `phase=completed` 且 `stage=complete` → 3 星
- 部分題目進入 `apprenticeship` 但未達 `complete` → 2 星
- 僅完成 `diagnosis` 階段 → 1 星

### 12.6 反思頁（ReflectionPanel）

**禁止**：eh 的書本翻頁造型（`relative w-full max-w-[1240px]` + 裝訂線 + 翻頁邊框）。

改用木框雙欄米紙 panel：

```jsx
<div className={WOOD_OUTER}>
  <div className={WOOD_INNER_CREAM + ' p-4 sm:p-6'}>
    <div className="grid md:grid-cols-2 gap-4">
      {/* 左欄：回顧 Tabs（多題切換） */}
      <section>
        <h3 className="font-black text-[#5A3E22] mb-2">📖 回顧</h3>
        {/* Tabs + 對話歷史滾動 */}
      </section>

      {/* 右欄：反思對話（與 AI 簡短互動） */}
      <section>
        <h3 className="font-black text-[#5A3E22] mb-2">✨ 反思</h3>
        {/* 對話氣泡 + 輸入框 */}
      </section>
    </div>
  </div>
</div>
```

**規格**：
- 雙欄使用 CSS grid `md:grid-cols-2`，手機為單欄堆疊
- 左欄已塵封的對話用 `text-white/40` 同等的暗化米色 `text-[#7A5232]/60`
- 右欄反思對話用正常米紙氣泡

### 12.7 「查看情境」摺疊按鈕（沿用既有 ChunkyButton ghost variant）

對話進行中可隨時喚回情境敘述：

```jsx
<ChunkyButton
  onClick={() => setExpanded(v => !v)}
  variant="ghost"
  label={expanded ? '收起情境' : '查看情境'}
  icon={expanded ? 'expand_less' : 'expand_more'}
  small
/>
```

### 12.8 元件 Checklist（治療對話頁實作前必讀）

實作 ScenarioChat 與相關子元件時，依序確認：

- [ ] 沒有任何元素使用 Duolingo 綠 `#58CC02` 或暗色背景 `#0f1d20`
- [ ] 進度條使用 `WoodenProgressBar`（教師綠填充 + 木框邊）
- [ ] 對話氣泡 AI=米紙、學生=綠，**不要**用半透明 `bg-white/15`
- [ ] 吉祥物用 `scilens_mascot.png` 或 `irasutoya_hero.png`，**不用** owl GIF
- [ ] 結算過關用 `WOOD_OUTER + WOOD_INNER_CREAM` + `StarRating`，**不用** monster GIF
- [ ] 反思頁用雙欄 grid + 木框，**不做**書本翻頁造型
- [ ] 所有 transition 用 `ease-[cubic-bezier(0.34,1.56,0.64,1)]`
- [ ] 共用元件從 `src/components/ui/woodKit.jsx` import

---

## 10. 風格演進歷史

| 版本 | 日期 | 主要風格 | 結果 |
|------|------|---------|------|
| v0 | 2026-04 之前 | Pastel & Soft Aesthetic（柔和淡綠） | 太像後台、不夠吸引學生 |
| v1 | 2026-04-29 | 動森 / Pokopia 風（奶油暖底 + 自然元素） | 過於柔軟、缺少冒險感 |
| **v2** | **2026-04-29** | **日系手遊冒險風（木框收集冊）** | **✅ 採用**：契合「進入冒險」情緒、視覺辨識度高、可擴展到其他頁面 |
| v2.1 | 2026-04-29 | 學生端闖關地圖（曲線路徑 + 圓形關卡節點 + START 氣泡） | ❌ 棄用：路徑隱含的順序感誤導 — 派題之間沒有先後關係（老師可能同時派多份），「線性闖關」不貼合系統本質 |
| v2.2 | 2026-04-29 | 學生端任務看板（雙層木框任務卡 + 標題木牌 + 副標 + 底部吉祥物 + footer） | ❌ 過度精緻：木框層層套娃、多行 meta、區塊文字累贅，視覺重點被稀釋 |
| v2.3 | 2026-04-29 | 學生端簡潔任務看板（單列扁卡 + 全幅草地背景 + 彩色背景 div） | ❌ 任務卡視覺權重不夠，標題不夠突出，列表不夠清楚 |
| **v2.4** | **2026-04-29** | **學生端寶可夢手遊風任務畫面**（HUD + 米紙 panel + 白底厚棕邊任務卡 + 厚黃 chunky 按鈕） | **✅ 採用**：頁面分為 sky HUD（透明 overlay）+ 圓角米紙 panel；任務卡白底厚棕邊 + 大圖示 + 大標題 + 進度條 + chunky 按鈕 + 卡底綠 band，視覺權重對齊參考圖（Pokemon Trainer Rank 升級畫面），任務列表清楚可見 |

**遇到風格衝突 / 需要例外時**：記錄在 `docs/deviations.md`，並更新本文件。
