import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow, Handle, Position,
  BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
  addEdge, reconnectEdge, MarkerType,
  useEdgesState, useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { useBulkSetCanvas, useBulkUpdatePositions, useUpdateKnowledgeNode } from '../../../hooks/useAdminKnowledgeNodes';

/**
 * React Flow 畫布（純拓撲）。
 * - Custom node + dagre 自動排版（參考官方 Layouting 範例）
 * - Custom edge 中點顯示 × 刪除鈕（參考官方 Custom Edges 範例）
 * - 拖曳節點：debounced 500ms 寫 canvas_x / canvas_y
 * - 連線：在兩節點 handle 之間畫線 → PATCH 目標節點 prerequisites
 */

const PARENT_PALETTE = [
  { stripe: '#10B981', chip: '#10B981', chipBg: '#D1FAE5' }, // green
  { stripe: '#3B82F6', chip: '#1D4ED8', chipBg: '#DBEAFE' }, // blue
  { stripe: '#F59E0B', chip: '#B45309', chipBg: '#FEF3C7' }, // amber
  { stripe: '#A855F7', chip: '#7E22CE', chipBg: '#F3E8FF' }, // purple
  { stripe: '#EC4899', chip: '#BE185D', chipBg: '#FCE7F3' }, // pink
  { stripe: '#06B6D4', chip: '#0E7490', chipBg: '#CFFAFE' }, // cyan
];

const NODE_WIDTH = 240;
const NODE_HEIGHT = 96;

function paletteForParent(code) {
  if (!code) return { stripe: '#9CA3AF', chip: '#4B5563', chipBg: '#F3F4F6' };
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return PARENT_PALETTE[hash % PARENT_PALETTE.length];
}

/** 透過 Context 把回呼傳到 custom node / custom edge 內部。 */
const EdgeDeleteContext = createContext(null);
const NodeRemoveContext = createContext(null);

/** Custom node：卡片設計，左側 accent stripe + 上下 handle dots + 右上 × 鈕（移出畫布）。 */
function KnowledgeFlowNode({ id, data, selected }) {
  const { stripe, chip, chipBg } = data.palette;
  const onRemove = useContext(NodeRemoveContext);
  return (
    <div
      style={{
        width: NODE_WIDTH,
        background: '#fff',
        borderRadius: 12,
        boxShadow: selected
          ? '0 0 0 2px #7DD3A8, 0 6px 18px rgba(125,211,168,0.35)'
          : '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        border: '1px solid #E5E7EB',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#fff', width: 10, height: 10,
          border: `2px solid ${stripe}`, top: -5,
        }}
      />
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: stripe,
      }} />
      <button
        type="button"
        className="nodrag kn-node-remove-btn"
        title="從畫布移除（節點與先備關係資料保留在節點庫）"
        onClick={(e) => { e.stopPropagation(); onRemove?.(id); }}
        style={{
          position: 'absolute',
          top: 6, right: 6,
          width: 18, height: 18,
          borderRadius: '50%',
          background: '#fff',
          border: '1px solid #E5E7EB',
          color: '#9CA3AF',
          fontSize: 12, fontWeight: 500, lineHeight: 1,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
          zIndex: 2,
        }}
      >×</button>
      <div style={{ padding: '10px 28px 10px 16px' }}>
        <div style={{
          fontWeight: 600, fontSize: 13, color: '#1F2937', lineHeight: 1.45,
          marginBottom: 6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {data.name}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 10, color: '#6B7280',
            background: '#F3F4F6', padding: '2px 6px', borderRadius: 4,
          }}>{data.nodeId}</span>
          {data.parentCode && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: chip, background: chipBg,
              padding: '2px 6px', borderRadius: 4,
            }}>{data.parentCode}</span>
          )}
          {/-Ⅲ-|-III-/.test(data.nodeId) && (
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: '#1E40AF', background: '#DBEAFE',
              padding: '2px 6px', borderRadius: 999,
            }}>高年級</span>
          )}
          {/-Ⅱ-|-II-/.test(data.nodeId) && !/-Ⅲ-|-III-/.test(data.nodeId) && (
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: '#B45309', background: '#FEF3C7',
              padding: '2px 6px', borderRadius: 999,
            }}>中年級</span>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#fff', width: 10, height: 10,
          border: `2px solid ${stripe}`, bottom: -5,
        }}
      />
    </div>
  );
}

const nodeTypes = { knowledge: KnowledgeFlowNode };

/** Custom edge：smoothstep + 中點 × 刪除鈕。 */
function DeletableSmoothStepEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd, style,
}) {
  const onDelete = useContext(EdgeDeleteContext);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button
          type="button"
          className="nodrag nopan kn-edge-delete-btn"
          title="刪除先備關係"
          onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            width: 22, height: 22, borderRadius: '50%',
            background: '#fff', border: '1px solid #E5E7EB',
            color: '#6B7280', fontSize: 16, fontWeight: 500, lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >
          ×
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { deletable: DeletableSmoothStepEdge };

/**
 * 用 dagre 計算 DAG 排版：source(prerequisite) 在上、target 在下。
 * 參考 https://reactflow.dev/examples/layout/dagre
 */
function autoLayout(rawNodes) {
  if (rawNodes.length === 0) return {};
  const nodeIds = new Set(rawNodes.map((n) => n.id));
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  rawNodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  rawNodes.forEach((n) => {
    (n.prerequisites || []).forEach((pre) => {
      if (nodeIds.has(pre)) g.setEdge(pre, n.id);
    });
  });

  dagre.layout(g);

  const positions = {};
  rawNodes.forEach((n) => {
    const pos = g.node(n.id);
    if (pos) {
      positions[n.id] = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
    }
  });
  return positions;
}

function toRfNodes(rawNodes) {
  const fallback = autoLayout(rawNodes);
  return rawNodes.map((n) => {
    const pos = (n.canvasX !== null && n.canvasY !== null && n.canvasX !== undefined && n.canvasY !== undefined)
      ? { x: n.canvasX, y: n.canvasY }
      : (fallback[n.id] ?? { x: 0, y: 0 });
    return {
      id: n.id,
      type: 'knowledge',
      position: pos,
      data: {
        name: n.name,
        nodeId: n.id,
        parentCode: n.parentCode,
        palette: paletteForParent(n.parentCode),
      },
    };
  });
}

const EDGE_STYLE = { stroke: '#94A3B8', strokeWidth: 2 };
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: '#94A3B8', width: 18, height: 18 };

function toRfEdges(rawNodes) {
  const edges = [];
  rawNodes.forEach((n) => {
    (n.prerequisites || []).forEach((src) => {
      edges.push({
        id: `${src}->${n.id}`,
        source: src,
        target: n.id,
        type: 'deletable',
        animated: false,
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
        zIndex: 1,
      });
    });
  });
  return edges;
}

export default function KnowledgeNodeCanvas({ nodes: rawNodes, focusNode = null, appliedLayout = null }) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const edgeReconnectSuccessful = useRef(true);
  const rfInstanceRef = useRef(null);
  const positionMut = useBulkUpdatePositions();
  const updateNodeMut = useUpdateKnowledgeNode();
  const setCanvasMut = useBulkSetCanvas();
  const debounceRef = useRef(null);
  // 用 ref 同步追蹤最新狀態，避免 debounce timeout / context callback 抓到 stale closure
  const rfNodesRef = useRef(rfNodes);
  const rfEdgesRef = useRef(rfEdges);
  useEffect(() => { rfNodesRef.current = rfNodes; }, [rfNodes]);
  useEffect(() => { rfEdgesRef.current = rfEdges; }, [rfEdges]);

  // 只在「節點 ID / 先備關係 / 名稱 / parent」結構真的變了才重設 React Flow 狀態。
  const structureKey = useMemo(
    () => rawNodes
      .map((n) => `${n.id}::${(n.prerequisites || []).join(',')}::${n.name}::${n.parentCode || ''}`)
      .sort()
      .join('|'),
    [rawNodes],
  );

  useEffect(() => {
    setRfNodes(toRfNodes(rawNodes));
    setRfEdges(toRfEdges(rawNodes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  // 左側清單點「在畫布」節點 → 平移聚焦並選取高亮（focusNode = { id, nonce }）。
  useEffect(() => {
    if (!focusNode?.id) return;
    const inst = rfInstanceRef.current;
    const node = rfNodesRef.current.find((n) => n.id === focusNode.id);
    if (!inst || !node) return;
    inst.setCenter(
      node.position.x + NODE_WIDTH / 2,
      node.position.y + NODE_HEIGHT / 2,
      { zoom: 1, duration: 400 },
    );
    setRfNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === focusNode.id })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNode]);

  // 自動排版：把按鈕算好的座標即時套到畫布節點並重新框選全圖（不等 DB 來回，馬上看到效果）。
  useEffect(() => {
    if (!appliedLayout?.positions) return;
    setRfNodes((ns) => ns.map((n) => {
      const p = appliedLayout.positions[n.id];
      return p ? { ...n, position: { x: p.x, y: p.y } } : n;
    }));
    const inst = rfInstanceRef.current;
    if (inst) setTimeout(() => inst.fitView({ padding: 0.2, duration: 400 }), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedLayout]);

  const flushPositions = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const positions = rfNodesRef.current.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
      if (positions.length > 0) {
        positionMut.mutate(positions);
      }
    }, 500);
  }, [positionMut]);

  const onNodeDragStop = useCallback(() => { flushPositions(); }, [flushPositions]);

  const onConnect = useCallback((params) => {
    setRfEdges((eds) => addEdge({
      ...params,
      type: 'deletable',
      style: EDGE_STYLE,
      markerEnd: EDGE_MARKER,
      zIndex: 1,
    }, eds));
    const target = rawNodes.find((n) => n.id === params.target);
    if (target) {
      const newPrereqs = Array.from(new Set([...(target.prerequisites || []), params.source]));
      updateNodeMut.mutate({ id: target.id, prerequisites: newPrereqs });
    }
  }, [setRfEdges, rawNodes, updateNodeMut]);

  const onReconnectStart = useCallback(() => { edgeReconnectSuccessful.current = false; }, []);
  const onReconnect = useCallback((oldEdge, newConnection) => {
    edgeReconnectSuccessful.current = true;
    setRfEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setRfEdges]);
  const onReconnectEnd = useCallback((_evt, edge) => {
    if (!edgeReconnectSuccessful.current) {
      setRfEdges((eds) => eds.filter((e) => e.id !== edge.id));
      const target = rawNodes.find((n) => n.id === edge.target);
      if (target) {
        const newPrereqs = (target.prerequisites || []).filter((p) => p !== edge.source);
        updateNodeMut.mutate({ id: target.id, prerequisites: newPrereqs });
      }
    }
    edgeReconnectSuccessful.current = true;
  }, [setRfEdges, rawNodes, updateNodeMut]);

  // 節點 × 鈕：從畫布移除（onCanvas=false）。節點與先備關係資料保留在 DB；下次再加回畫布時會復原。
  const handleRemoveFromCanvas = useCallback((nodeId) => {
    setRfNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setRfEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setCanvasMut.mutate({ nodeIds: [nodeId], onCanvas: false });
  }, [setRfNodes, setRfEdges, setCanvasMut]);

  // 邊 × 鈕：刪除一條先備關係連線
  const handleDeleteEdge = useCallback((edgeId) => {
    const edge = rfEdgesRef.current.find((e) => e.id === edgeId);
    if (!edge) return;
    setRfEdges((eds) => eds.filter((e) => e.id !== edgeId));
    const target = rawNodes.find((n) => n.id === edge.target);
    if (target) {
      const newPrereqs = (target.prerequisites || []).filter((p) => p !== edge.source);
      updateNodeMut.mutate({ id: target.id, prerequisites: newPrereqs });
    }
  }, [setRfEdges, rawNodes, updateNodeMut]);

  return (
    <div
      className="kn-canvas w-full"
      style={{
        height: 'calc(100vh - 180px)',
        minHeight: 500,
        background: '#FAFBFC',
        borderRadius: 16,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .kn-canvas .react-flow__edges { z-index: 5 !important; }
        .kn-canvas .react-flow__edge-interaction { pointer-events: none !important; }
        .kn-canvas .react-flow__edgeupdater { pointer-events: all !important; }
        .kn-canvas .react-flow__handle { transition: transform 0.12s ease; }
        .kn-canvas .react-flow__handle:hover { transform: scale(1.4); }
        .kn-canvas .react-flow__controls button {
          background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; margin: 2px;
        }
        .kn-canvas .react-flow__controls { box-shadow: none; }
        .kn-canvas .react-flow__minimap {
          border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;
        }
        .kn-canvas .kn-edge-delete-btn {
          opacity: 0.7;
          transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .kn-canvas .kn-edge-delete-btn:hover {
          opacity: 1;
          background: #FEE2E2 !important; color: #DC2626 !important; border-color: #FCA5A5 !important;
        }
        .kn-canvas .kn-node-remove-btn {
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .kn-canvas .react-flow__node:hover .kn-node-remove-btn { opacity: 0.85; }
        .kn-canvas .kn-node-remove-btn:hover {
          opacity: 1 !important;
          background: #FEE2E2 !important; color: #DC2626 !important; border-color: #FCA5A5 !important;
        }
      `}</style>
      <EdgeDeleteContext.Provider value={handleDeleteEdge}>
       <NodeRemoveContext.Provider value={handleRemoveFromCanvas}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          onNodeDragStop={onNodeDragStop}
          onInit={(inst) => { rfInstanceRef.current = inst; }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'deletable', zIndex: 1 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#D1D5DB"
          />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(244,248,246,0.7)"
            nodeColor={(n) => n.data?.palette?.stripe ?? '#9CA3AF'}
            nodeStrokeWidth={0}
          />
        </ReactFlow>
       </NodeRemoveContext.Provider>
      </EdgeDeleteContext.Provider>
    </div>
  );
}

// Export auto-layout helper（給「自動排版」按鈕呼叫）
// eslint-disable-next-line react-refresh/only-export-components
export function computeAutoLayout(rawNodes) {
  return autoLayout(rawNodes);
}
