/**
 * 技能樹排版（資料驅動）。
 *
 * 給一組節點（含 id / name / parentCode / parentName / prerequisites），
 * 算出每個節點在技能樹地圖上的座標、所屬群組（大節點 / 子主題）、階段（學習深度）、
 * 以及是否為終點節點，讓 KnowledgeSkillTree 可以渲染任何單元的地圖。
 *
 * 排版原則：
 *  - 階段（欄）＝節點在「先備關係 DAG」中的最長路徑深度（沒有先備＝階段 0）。
 *  - 群組（列）＝parentCode（大節點 / 子主題），依首次出現順序排列、各佔一條水平帶。
 *  - 同一群組同一階段若有多個節點（平行節點）→ 垂直堆疊。
 *  - 終點節點（不是任何節點的先備）→ 標記 gold（★ 終點）。
 */

export const HEX_R = 42;

/**
 * 群組鍵：優先用管理員設定的大節點（parentCode / parentName）；
 * 若單元尚未綁定大節點（如示範用「水溶液」節點），退而用節點 ID 去掉末段的前綴
 * （例：INe-Ⅱ-3-01 → INe-Ⅱ-3），讓不同子主題仍能分列、不重疊。
 */
export function groupKeyOf(n) {
  if (n.parentCode) return n.parentCode;
  if (n.parentName) return n.parentName;
  const s = String(n.id ?? '');
  const cut = s.lastIndexOf('-');
  return cut > 0 ? s.slice(0, cut) : '__none__';
}

/** 示範用「水溶液」節點未綁大節點，給其 ID 前綴對應友善的子主題名稱。 */
const LEGACY_GROUP_LABELS = {
  'INe-Ⅱ-3': '子主題 A · 溶解',
  'INe-Ⅲ-5': '子主題 B · 酸鹼',
};

export function groupLabelOf(n, key) {
  if (n.parentName) return n.parentName;
  if (n.parentCode) return n.parentCode;
  if (LEGACY_GROUP_LABELS[key]) return LEGACY_GROUP_LABELS[key];
  return key === '__none__' ? '知識節點' : key;
}

const COL_W = 150;
const X0 = 110;
const Y_TOP = 70;
const BAND_H = 230;
const PARALLEL_GAP = 105;

/** 計算每個節點的階段（最長先備鏈長度），含環狀保護。 */
function computeStages(nodes, byId) {
  const memo = new Map();
  const visiting = new Set();
  const depth = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const n = byId.get(id);
    const pres = (n?.prerequisites || []).filter((p) => byId.has(p));
    const d = pres.length ? 1 + Math.max(...pres.map(depth)) : 0;
    visiting.delete(id);
    memo.set(id, d);
    return d;
  };
  nodes.forEach((n) => depth(n.id));
  return memo;
}

export function computeSkillTreeLayout(nodes = []) {
  if (!nodes.length) {
    return { nodes: [], positions: new Map(), edges: [], groups: [], width: 1000, height: 300, maxStage: 0 };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const stageOf = computeStages(nodes, byId);

  // 終點節點：沒有被任何節點當作先備
  const isPrereq = new Set();
  nodes.forEach((n) => (n.prerequisites || []).forEach((p) => { if (byId.has(p)) isPrereq.add(p); }));

  // 群組（依首次出現順序）
  const groupOrder = [];
  const groupMap = new Map();
  nodes.forEach((n) => {
    const key = groupKeyOf(n);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        code: n.parentCode || '',
        label: groupLabelOf(n, key),
        nodes: [],
      });
      groupOrder.push(key);
    }
    groupMap.get(key).nodes.push(n);
  });

  const outNodes = [];
  const positions = new Map();
  const groups = [];
  let maxStage = 0;

  groupOrder.forEach((key, gi) => {
    const g = groupMap.get(key);
    const bandTop = Y_TOP + gi * BAND_H;
    const centerY = bandTop + BAND_H / 2;

    const byStage = new Map();
    g.nodes.forEach((n) => {
      const s = stageOf.get(n.id) || 0;
      maxStage = Math.max(maxStage, s);
      if (!byStage.has(s)) byStage.set(s, []);
      byStage.get(s).push(n);
    });

    byStage.forEach((list, s) => {
      list.forEach((n, i) => {
        const x = X0 + s * COL_W;
        const y = centerY + (i - (list.length - 1) / 2) * PARALLEL_GAP;
        const entry = {
          id: n.id, name: n.name, x, y,
          stage: s, groupIndex: gi, gold: !isPrereq.has(n.id),
        };
        outNodes.push(entry);
        positions.set(n.id, entry);
      });
    });

    groups.push({
      key, code: g.code, label: g.label, groupIndex: gi,
      labelY: bandTop + 26, count: g.nodes.length,
    });
  });

  const edges = [];
  nodes.forEach((n) => (n.prerequisites || []).forEach((p) => {
    if (byId.has(p)) edges.push([p, n.id]);
  }));

  const width = Math.max(1000, X0 + maxStage * COL_W + 140);
  const height = Y_TOP + groupOrder.length * BAND_H;

  return { nodes: outNodes, positions, edges, groups, width, height, maxStage, colX: X0, colW: COL_W };
}

/** 短碼：去掉常見前綴，技能樹六角形內顯示用。 */
export function shortNodeLabel(id) {
  return String(id ?? '').replace(/^INe-/, '');
}
