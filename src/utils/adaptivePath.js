/**
 * 本次施測適性路徑（診斷報告用）純 helper。
 *
 * 資料來自後端 POST /api/adaptive/trace-path（重播適性引擎，spec-10 §10.6）。
 * 本檔只做「報告端逐題結果 → trace-path 的 answered payload」與摘要統計，
 * 不含 React／不呼叫 API，方便學生端（木框風）與教師端（卡片風）共用。
 */

/**
 * 由報告的逐題結果組出 trace-path 需要的 answered payload。
 * passed 以「第一層作答」為準（施測中動態選題當初的依據）：
 * two-tier 為 quadrant==='TT'；single（無 quadrant）沿用 correct/diagnosis。
 * 同一節點只保留第一筆（示範題組為 1 節點 1 題）。
 *
 * @param {Array<{nodeId?:string, quadrant?:string|null, correct?:boolean, diagnosis?:string}>} items
 * @returns {Array<{nodeId:string, passed:boolean}>}
 */
export function buildTraceAnswered(items) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    const nodeId = it?.nodeId;
    if (!nodeId || seen.has(nodeId)) continue;
    seen.add(nodeId);
    const passed = it.quadrant
      ? it.quadrant === 'TT'
      : (typeof it.correct === 'boolean' ? it.correct : it.diagnosis === 'CORRECT');
    out.push({ nodeId, passed });
  }
  return out;
}

/**
 * trace-path 回應的摘要統計，供報告文案使用。
 * @param {{steps?:Array<{kind:string}>, skippedNodeIds?:string[], consistent?:boolean}} data
 */
export function summarizeAdaptivePath(data) {
  const steps = data?.steps ?? [];
  const retreatCount = steps.filter((s) => s.kind === 'retreat').length;
  const skippedCount = (data?.skippedNodeIds ?? []).length;
  return {
    total: steps.length,
    retreatCount,
    skippedCount,
    hasRetreat: retreatCount > 0,
    hasSkip: skippedCount > 0,
    // 只有「重播與作答一致」且至少問過一題，才適合呈現路徑（排除舊的非適性資料）。
    showable: !!data?.consistent && steps.length > 0,
  };
}
