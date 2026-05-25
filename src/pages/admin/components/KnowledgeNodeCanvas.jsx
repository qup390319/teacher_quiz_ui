import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background, Controls, MiniMap, ReactFlow, addEdge, reconnectEdge,
  useEdgesState, useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useBulkUpdatePositions, useUpdateKnowledgeNode } from '../../../hooks/useAdminKnowledgeNodes';

/**
 * React Flow 畫布：節點 + 先備關係箭頭。
 * - 拖曳節點：debounced 500ms 寫 canvas_x / canvas_y
 * - 連線：在兩節點間畫線 → PATCH 目標節點 prerequisites
 * - 點節點：onSelectNode(node)
 * - 同單元節點 + 自動排版按鈕（依 learning_order grid）
 */

const PARENT_COLORS = [
  '#7DD3A8', '#5BA8DC', '#F0B962', '#D4A5F0', '#F4B6C2', '#FCD34D',
];

function colorForParent(code) {
  if (!code) return '#9CA3AF';
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return PARENT_COLORS[hash % PARENT_COLORS.length];
}

function autoLayout(rawNodes) {
  // 依 parent_code 分欄，learning_order 分列；間距 (240, 110)
  const lanes = new Map();
  rawNodes.forEach((n) => {
    const key = n.parentCode || '__';
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key).push(n);
  });
  const positions = {};
  let laneIdx = 0;
  lanes.forEach((arr) => {
    arr.sort((a, b) => (a.learningOrder ?? 0) - (b.learningOrder ?? 0));
    arr.forEach((n, i) => {
      positions[n.id] = { x: laneIdx * 280 + 20, y: i * 130 + 20 };
    });
    laneIdx += 1;
  });
  return positions;
}

function toRfNodes(rawNodes, selectedId) {
  const fallback = autoLayout(rawNodes);
  return rawNodes.map((n) => {
    const pos = (n.canvasX !== null && n.canvasY !== null)
      ? { x: n.canvasX, y: n.canvasY }
      : fallback[n.id];
    const color = colorForParent(n.parentCode);
    const isSel = n.id === selectedId;
    return {
      id: n.id,
      type: 'default',
      position: pos,
      data: {
        label: (
          <div style={{ textAlign: 'left', maxWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#1F2937' }}>{n.name}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6B7280', marginTop: 2 }}>{n.id}</div>
            {n.parentCode && (
              <div style={{ fontSize: 10, color, marginTop: 2 }}>{n.parentCode}</div>
            )}
          </div>
        ),
      },
      style: {
        background: '#fff',
        border: `2px solid ${isSel ? '#15803D' : color}`,
        borderRadius: 12,
        padding: 8,
        boxShadow: isSel ? '0 4px 10px rgba(21,128,61,0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
      },
    };
  });
}

function toRfEdges(rawNodes) {
  const edges = [];
  rawNodes.forEach((n) => {
    (n.prerequisites || []).forEach((src) => {
      edges.push({
        id: `${src}->${n.id}`,
        source: src,
        target: n.id,
        animated: false,
        style: { stroke: '#7DD3A8', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#5FBF8E' },
      });
    });
  });
  return edges;
}

export default function KnowledgeNodeCanvas({ nodes: rawNodes, selectedId, onSelectNode }) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const edgeReconnectSuccessful = useRef(true);
  const positionMut = useBulkUpdatePositions();
  const updateNodeMut = useUpdateKnowledgeNode();
  const debounceRef = useRef(null);

  const initialNodes = useMemo(() => toRfNodes(rawNodes, selectedId), [rawNodes, selectedId]);
  const initialEdges = useMemo(() => toRfEdges(rawNodes), [rawNodes]);

  useEffect(() => {
    setRfNodes(initialNodes);
    setRfEdges(initialEdges);
  }, [initialNodes, initialEdges, setRfNodes, setRfEdges]);

  const flushPositions = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const positions = rfNodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
      if (positions.length > 0) {
        positionMut.mutate(positions);
      }
    }, 500);
  }, [rfNodes, positionMut]);

  const onNodeDragStop = useCallback(() => { flushPositions(); }, [flushPositions]);

  const onConnect = useCallback((params) => {
    setRfEdges((eds) => addEdge({
      ...params,
      style: { stroke: '#7DD3A8', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color: '#5FBF8E' },
    }, eds));
    // 把 source 加到 target 的 prerequisites（透過 PATCH）
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

  const onNodeClick = useCallback((_evt, node) => {
    const raw = rawNodes.find((n) => n.id === node.id);
    if (raw && onSelectNode) onSelectNode(raw);
  }, [rawNodes, onSelectNode]);

  return (
    <div className="w-full h-full" style={{ height: 600 }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="#E5E7EB" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap pannable zoomable maskColor="rgba(244,248,246,0.6)" />
      </ReactFlow>
    </div>
  );
}

// Export auto-layout helper
// eslint-disable-next-line react-refresh/only-export-components
export function computeAutoLayout(rawNodes) {
  return autoLayout(rawNodes);
}
