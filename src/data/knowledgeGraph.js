/**
 * 「水溶液」單元知識節點與迷思概念 — W5b 之後改為從後端 API 動態載入。
 *
 * 演進歷程：
 *  - W1 ~ W5a：完整 hard-code，包含 12 節點 + 48 迷思 + 教師輔助 + 學生提示
 *  - W5b（本檔當前狀態）：`knowledgeNodes` 是空陣列，需在 app boot 階段呼叫
 *    `loadKnowledgeGraph()` 從 `/api/knowledge-nodes` 拉資料並填入；helpers
 *    （getNodeById / getMisconceptionById / mergeCustomsIntoNode）維持同一 API
 *    讓 30+ 既有 consumer 可以零修改繼續運作。
 *  - 管理員透過 `/admin/knowledge-nodes` 編輯後，重新整理頁面即可看到變化。
 *
 * 注意：本陣列 reference 不可重新賦值（避免 const re-binding），但內容會在
 * loadKnowledgeGraph() 中以 `length=0` + `push(...)` 原地置換。
 */

/** 12 節點主資料；初始為空，由 loadKnowledgeGraph() 填入。 */
export const knowledgeNodes = [];

/** 載入旗標，避免重複請求。 */
let loadPromise = null;

/**
 * 把後端回傳的節點轉成舊 hard-code shape。
 * 主要差異：
 *  - API 用 `learningOrder` / 舊有用 `level`
 *  - API 多了 `parentCode` / `parentName` / `unitId` / `gradeBand`（保留，consumer 看不到不影響）
 *  - 迷思結構（label / detail / studentDetail / confirmQuestion）兩邊一致
 */
function apiToOldShape(apiNode) {
  return {
    id: apiNode.id,
    name: apiNode.name,
    description: apiNode.description ?? '',
    videoUrl: apiNode.videoUrl ?? '',
    videoTitle: apiNode.videoTitle ?? '',
    level: apiNode.learningOrder ?? 1,
    prerequisites: apiNode.prerequisites ?? [],
    misconceptions: (apiNode.misconceptions ?? []).map((m) => ({
      id: m.id,
      label: m.label,
      detail: m.detail ?? '',
      studentDetail: m.studentDetail ?? '',
      confirmQuestion: m.confirmQuestion ?? '',
    })),
    teachingStrategy: apiNode.teachingStrategy ?? '',
    studentHint: apiNode.studentHint ?? '',
    // 額外保留：給 admin / 未來消費者用
    unitId: apiNode.unitId ?? null,
    gradeBand: apiNode.gradeBand ?? null,
    parentCode: apiNode.parentCode ?? null,
    parentName: apiNode.parentName ?? null,
  };
}

/**
 * 從後端載入知識節點並填入 knowledgeNodes 陣列。
 * 由 src/main.jsx 在 ReactDOM.render() 之前 await 呼叫一次。
 * 也允許重複呼叫（例如手動 refresh）；同時併發呼叫會共用同一個 promise。
 */
export async function loadKnowledgeGraph({ unitId = 'unit-water-solution' } = {}) {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const qs = unitId ? `?unitId=${encodeURIComponent(unitId)}` : '';
    const res = await fetch(`/api/knowledge-nodes${qs}`, { credentials: 'include' });
    if (!res.ok) {
      // 保留空陣列；讓 UI 顯示「無資料」而非崩潰。
      console.error('[knowledgeGraph] load failed:', res.status);
      return;
    }
    const data = await res.json();
    knowledgeNodes.length = 0;
    knowledgeNodes.push(...data.map(apiToOldShape));
  })();
  try {
    await loadPromise;
  } finally {
    // 完成後保留 promise 以利重複呼叫；下次想強制重新拉用 reloadKnowledgeGraph()
  }
}

/** 強制重新拉取（admin 編輯後可手動觸發；目前未由 UI 呼叫，但保留 API）。 */
export async function reloadKnowledgeGraph(opts = {}) {
  loadPromise = null;
  await loadKnowledgeGraph(opts);
}

export const getNodeById = (id) => knowledgeNodes.find((n) => n.id === id);

export const getMisconceptionById = (mid) => {
  for (const node of knowledgeNodes) {
    const m = node.misconceptions.find((mm) => mm.id === mid);
    if (m) return { ...m, nodeId: node.id, nodeName: node.name };
  }
  return null;
};

/**
 * 把教師自訂迷思（從 useCustomMisconceptions hook 拉到的陣列）合併進指定節點。
 * 自訂迷思帶 isCustom: true 旗標，下游 UI 可用此判斷是否要顯示「自訂」徽章/刪除按鈕。
 * 不會修改原 knowledgeNodes 陣列。
 *
 * @param {object} node — 從 getNodeById 取得的節點
 * @param {Array} customs — 該教師全部的自訂迷思（會自動依 nodeId 過濾）
 * @returns {object} 新節點（misconceptions 是合併後的新陣列）
 */
export const mergeCustomsIntoNode = (node, customs = []) => {
  if (!node) return node;
  const own = customs.filter((c) => c.nodeId === node.id);
  if (own.length === 0) return node;
  return {
    ...node,
    misconceptions: [
      ...node.misconceptions,
      ...own.map((c) => ({
        id: c.id,
        label: c.label,
        detail: c.detail,
        studentDetail: c.studentDetail,
        confirmQuestion: c.confirmQuestion,
        isCustom: true,
      })),
    ],
  };
};

/** Convenience：用 nodeId + customs 直接拿到合併後節點。*/
export const getNodeByIdWithCustoms = (id, customs = []) =>
  mergeCustomsIntoNode(getNodeById(id), customs);
