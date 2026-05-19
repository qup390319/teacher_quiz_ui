import { useState } from 'react';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import { getAllPrerequisites } from '../../utils/topoSortNodes';

const SUBTOPIC_A = knowledgeNodes.filter(n => n.id.startsWith('INe-II'));
const SUBTOPIC_B = knowledgeNodes.filter(n => n.id.startsWith('INe-Ⅲ'));

function shortId(id) {
  if (id.startsWith('INe-II-3-')) return id.replace('INe-II-3-', 'A-');
  if (id.startsWith('INe-Ⅲ-5-')) return id.replace('INe-Ⅲ-5-', 'B-');
  return id;
}

export default function NodeRelationshipMatrix() {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState('all');

  const nodes = selectedSubtopic === 'A' ? SUBTOPIC_A
    : selectedSubtopic === 'B' ? SUBTOPIC_B
    : knowledgeNodes;

  const prereqMap = {};
  for (const node of knowledgeNodes) {
    prereqMap[node.id] = getAllPrerequisites(node.id);
  }

  const getCellType = (rowId, colId) => {
    if (rowId === colId) return 'self';
    if (nodes.find(n => n.id === rowId)?.prerequisites.includes(colId)) return 'direct';
    if (prereqMap[rowId]?.includes(colId)) return 'transitive';
    return 'none';
  };

  const cellStyle = (type) => {
    switch (type) {
      case 'self': return 'bg-[#2D3436] text-white';
      case 'direct': return 'bg-[#8FC87A] text-[#2D3436]';
      case 'transitive': return 'bg-[#E2F4D8] text-[#3D5A3E]';
      default: return 'bg-white text-[#D5D8DC]';
    }
  };

  const cellLabel = (type) => {
    switch (type) {
      case 'self': return '';
      case 'direct': return '直接';
      case 'transitive': return '間接';
      default: return '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#2D3436]">知識節點關係矩陣</h3>
          <p className="text-sm text-[#636E72] mt-0.5">
            列 = 目標節點，欄 = 先備節點。綠色表示先備依賴關係。
          </p>
        </div>
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: '全部' },
            { key: 'A', label: '子主題 A' },
            { key: 'B', label: '子主題 B' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setSelectedSubtopic(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                selectedSubtopic === t.key
                  ? 'bg-[#8FC87A] border-[#76B563] text-[#2D3436]'
                  : 'bg-white border-[#BDC3C7] text-[#636E72] hover:bg-[#EEF5E6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#BDC3C7]">
        <table className="text-xs bg-white" style={{ minWidth: nodes.length * 60 + 160 }}>
          <thead>
            <tr className="bg-[#EEF5E6]">
              <th className="px-3 py-2 text-left text-[#636E72] font-bold border-r border-[#BDC3C7] sticky left-0 bg-[#EEF5E6] z-10">
                目標 ↓ / 先備 →
              </th>
              {nodes.map(col => (
                <th key={col.id}
                  className={`px-1.5 py-2 text-center font-bold border-r border-[#D5D8DC] transition-colors ${
                    hoveredNode === col.id ? 'bg-[#C8EAAE]' : ''
                  }`}
                  onMouseEnter={() => setHoveredNode(col.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  title={col.name}
                >
                  <div className="whitespace-nowrap">{shortId(col.id)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map(row => (
              <tr key={row.id} className="border-t border-[#D5D8DC]">
                <td
                  className={`px-3 py-2 font-bold border-r border-[#BDC3C7] sticky left-0 z-10 transition-colors ${
                    hoveredNode === row.id ? 'bg-[#C8EAAE]' : 'bg-white'
                  }`}
                  onMouseEnter={() => setHoveredNode(row.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  title={row.name}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      row.id.startsWith('INe-II') ? 'bg-[#5DADE2]' : 'bg-[#AF7AC5]'
                    }`} />
                    <span className="text-[#2D3436] whitespace-nowrap">{shortId(row.id)}</span>
                  </div>
                </td>
                {nodes.map(col => {
                  const type = getCellType(row.id, col.id);
                  return (
                    <td key={col.id}
                      className={`px-1 py-1.5 text-center border-r border-[#D5D8DC] transition-all ${cellStyle(type)} ${
                        (hoveredNode === row.id || hoveredNode === col.id) && type !== 'self'
                          ? 'ring-1 ring-inset ring-[#8FC87A]'
                          : ''
                      }`}
                      title={type === 'self' ? row.name
                        : type === 'direct' ? `${row.name} 直接依賴 ${col.name}`
                        : type === 'transitive' ? `${row.name} 間接依賴 ${col.name}`
                        : ''}
                    >
                      {type === 'self' ? (
                        <span className="text-[10px]">●</span>
                      ) : (
                        <span className="text-[10px] font-medium">{cellLabel(type)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-[#636E72]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#8FC87A]" /> 直接先備
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#E2F4D8]" /> 間接先備（傳遞性）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#2D3436]" /> 自身
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#5DADE2]" /> 子主題 A（溶解）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#AF7AC5]" /> 子主題 B（酸鹼）
        </span>
      </div>

      {hoveredNode && (
        <div className="mt-3 p-3 bg-[#EEF5E6] rounded-xl border border-[#BDC3C7] text-sm">
          <p className="font-bold text-[#2D3436]">
            {shortId(hoveredNode)}：{knowledgeNodes.find(n => n.id === hoveredNode)?.name}
          </p>
          <p className="text-[#636E72] mt-1">
            直接先備：{
              knowledgeNodes.find(n => n.id === hoveredNode)?.prerequisites.length > 0
                ? knowledgeNodes.find(n => n.id === hoveredNode).prerequisites.map(p => shortId(p)).join('、')
                : '無（起始節點）'
            }
            {' · '}
            所有先備：{
              prereqMap[hoveredNode]?.length > 0
                ? prereqMap[hoveredNode].map(p => shortId(p)).join('、')
                : '無'
            }
          </p>
        </div>
      )}
    </div>
  );
}
