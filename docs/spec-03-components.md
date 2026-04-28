# SPEC-03: Components / 共用元件規格

## 1. 元件總覽

| 元件名稱 | 檔案路徑 | 用途 |
|----------|----------|------|
| `TeacherLayout` | `src/components/TeacherLayout.jsx` | 教師端頁面佈局（側邊欄 + 內容區） |
| `StepIndicator` | `src/components/StepIndicator.jsx` | 多步驟精靈的進度指示器 |
| `InfoButton` | `src/components/InfoButton.jsx` | 圓形資訊按鈕，觸發 InfoDrawer |
| `InfoDrawer` | `src/components/InfoDrawer.jsx` | 側邊滑出面板，顯示資料計算說明 |

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

導航選單分為三個區段（section divider）：

**無分類（頂部）**:
| 項目名稱 | 路由目標 | 圖示 |
|----------|----------|------|
| 首頁 | `/teacher` | Home icon |
| 診斷結果 | `/teacher/dashboard` | Chart icon |

**考卷（section: 考卷）**:
| 項目名稱 | 路由目標 | 圖示 |
|----------|----------|------|
| 出題管理 | `/teacher/quizzes` | File icon |
| 派題管理 | `/teacher/assignments` | Send icon |

**班級（section: 班級）**:
| 項目名稱 | 路由目標 | 圖示 |
|----------|----------|------|
| 班級管理 | `/teacher/classes` | Users icon |

**其他（section: 其他）**:
| 項目名稱 | 路由目標 | 圖示 |
|----------|----------|------|
| 知識節點總覽 | `/teacher/knowledge-map` | Grid icon |

### 行為
- 當前路由對應的選單項目以高亮色顯示（`bg-[#C8EAAE]` + `border-[#8FC87A]`）
- 首頁路由使用 `end` 屬性避免子路由也高亮
- 底部按鈕文字為「切換角色」（非「登出」），點擊後清除角色並導航至 `/`

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
