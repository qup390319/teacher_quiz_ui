import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';
import InfoButton from '../../components/InfoButton';
import InfoDrawer from '../../components/InfoDrawer';
import { CHART_INFO } from '../../data/chartInfoConfig';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import {
  getQuizQuestions, getClassAnswers,
  getQuestionStats, getMisconceptionStudents, getNodePassRates,
} from '../../data/quizData';

// ─── 常數 & Helper ────────────────────────────────────────────────────────────
const CLASS_KEY_MAP = { 'class-A': 'classA', 'class-B': 'classB', 'class-C': 'classC' };
const CLASS_CHART_COLORS = { 'class-A': '#8FC87A', 'class-B': '#5DADE2', 'class-C': '#F4D03F' };

function getAssignment(assignments, classId, quizId) {
  return assignments.find(a => a.classId === classId && a.quizId === quizId) ?? null;
}

function getAvailableQuizzesForClass(assignments, quizzes, classId) {
  const quizIds = [...new Set(assignments.filter(a => a.classId === classId).map(a => a.quizId))];
  return quizzes.filter(q => quizIds.includes(q.id));
}

function getAllAssignedQuizzes(assignments, quizzes) {
  const quizIds = [...new Set(assignments.map(a => a.quizId))];
  return quizzes.filter(q => quizIds.includes(q.id));
}

function getLatestQuizIdForClass(assignments, classId) {
  const sorted = assignments
    .filter(a => a.classId === classId)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  return sorted[0]?.quizId ?? null;
}

// 為指定考卷動態計算跨班診斷資料
function computeOverviewForQuiz(quizId, classes, assignments) {
  const questions = getQuizQuestions(quizId);
  if (questions.length === 0) return null;
  const nodeIds = [...new Set(questions.map(q => q.knowledgeNodeId))];

  const classStats = [];
  classes.forEach(cls => {
    const assignment = getAssignment(assignments, cls.id, quizId);
    if (!assignment) return;

    const answersData = getClassAnswers(quizId, cls.id);
    const totalStudents = answersData.length;

    const passRates = getNodePassRates(quizId, cls.id);
    const vals = Object.values(passRates);
    const avgPassRate = vals.length > 0
      ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;

    const misconStudents = getMisconceptionStudents(quizId, cls.id);
    const highFreqMisconCount = totalStudents > 0
      ? Object.values(misconStudents)
          .filter(students => Math.round((students.length / totalStudents) * 100) >= 30).length
      : 0;

    classStats.push({
      id: cls.id,
      name: cls.name,
      color: CLASS_CHART_COLORS[cls.id] || '#BDC3C7',
      completionRate: assignment.completionRate,
      avgPassRate,
      highFreqMisconCount,
      pendingStudents: assignment.totalStudents - assignment.submittedCount,
    });
  });

  if (classStats.length === 0) return null;

  const nodePassRates = nodeIds.map(nodeId => {
    const node = knowledgeNodes.find(n => n.id === nodeId);
    const entry = { name: node?.name ?? nodeId, id: nodeId };
    classStats.forEach(cs => {
      const rates = getNodePassRates(quizId, cs.id);
      entry[CLASS_KEY_MAP[cs.id] ?? cs.id] = rates[nodeId] ?? 0;
    });
    return entry;
  });

  const misconMap = {};
  classStats.forEach(cs => {
    const answersData = getClassAnswers(quizId, cs.id);
    const total = answersData.length;
    if (total === 0) return;
    const ms = getMisconceptionStudents(quizId, cs.id);
    Object.entries(ms).forEach(([mid, students]) => {
      if (!misconMap[mid]) {
        const nd = knowledgeNodes.find(n => n.misconceptions?.find(m => m.id === mid));
        const mc = nd?.misconceptions?.find(m => m.id === mid);
        misconMap[mid] = { id: mid, label: mc?.label ?? mid, node: nd?.name ?? '' };
      }
      misconMap[mid][CLASS_KEY_MAP[cs.id] ?? cs.id] = Math.round((students.length / total) * 100);
    });
  });

  const topMisconceptions = Object.values(misconMap).map(m => {
    const keys = classStats.map(cs => CLASS_KEY_MAP[cs.id] ?? cs.id);
    const values = keys.map(k => m[k] || 0).filter(v => v > 0);
    keys.forEach(k => { if (m[k] === undefined) m[k] = 0; });
    return { ...m, avg: values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0 };
  }).sort((a, b) => b.avg - a.avg).slice(0, 6);

  return { classStats, nodePassRates, topMisconceptions };
}


// ─── AI 診斷摘要 ──────────────────────────────────────────────────────────────
function AIDiagnosisSummary({ quizId, classId, totalStudents }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const passRates = getNodePassRates(quizId, classId);
  const misconStudents = getMisconceptionStudents(quizId, classId);

  const passRateValues = Object.values(passRates);
  const avgPassRate = passRateValues.length > 0
    ? Math.round(passRateValues.reduce((s, v) => s + v, 0) / passRateValues.length)
    : 0;

  const highFreqMiscons = Object.entries(misconStudents)
    .map(([id, students]) => ({
      id,
      count: students.length,
      pct: Math.round((students.length / totalStudents) * 100),
    }))
    .filter(({ pct }) => pct >= 30)
    .sort((a, b) => b.pct - a.pct);

  const isGood = avgPassRate >= 70 && highFreqMiscons.length === 0;
  const isWarning = !isGood && (avgPassRate >= 50 || highFreqMiscons.length <= 2);
  const health = isGood
    ? { label: '班級表現良好', color: 'bg-[#C8EAAE] text-[#3D5A3E] border-[#8FC87A]' }
    : isWarning
    ? { label: '需要關注', color: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
    : { label: '需要介入', color: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' };

  const topMiscon = highFreqMiscons[0];
  const topMisconNode = topMiscon
    ? knowledgeNodes.find(n => n.misconceptions.find(m => m.id === topMiscon.id))
    : null;
  const topMisconLabel = topMisconNode?.misconceptions.find(m => m.id === topMiscon?.id)?.label;

  let coreSentence;
  if (isGood) {
    coreSentence = `概念平均掌握率 ${avgPassRate}%，無高頻迷思需要補救，建議維持現有教學節奏並可安排延伸挑戰活動。`;
  } else if (topMiscon && avgPassRate < 70) {
    coreSentence = `${topMiscon.pct}% 學生持有「${topMisconLabel}」迷思，概念平均掌握率僅 ${avgPassRate}%，建議優先針對此概念進行補救教學。`;
  } else if (topMiscon) {
    coreSentence = `${topMiscon.pct}% 學生持有「${topMisconLabel}」迷思，建議安排針對性補救教學以澄清概念。`;
  } else {
    coreSentence = `概念平均掌握率 ${avgPassRate}%，整體學習情形需要進一步強化，請參考下方各概念分析。`;
  }

  const seenNodeIds = new Set();
  const priorityNodes = highFreqMiscons
    .map(({ id }) => knowledgeNodes.find(n => n.misconceptions.find(m => m.id === id)))
    .filter(Boolean)
    .sort((a, b) => a.level - b.level)
    .filter(node => {
      if (seenNodeIds.has(node.id)) return false;
      seenNodeIds.add(node.id);
      return true;
    });

  const nextStep = isGood
    ? '可設計跨概念的應用情境題，進行延伸學習，強化概念遷移能力。'
    : isWarning
    ? '建議在下次教學中加入針對性例題，觀察學生反應後，再評估是否需要安排補救課。'
    : '建議本週安排一節概念補救課，以小組討論方式澄清核心迷思，再進行診斷複測。';

  return (
    <div className="bg-white rounded-[32px] border border-[#8FC87A] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#3D5A3E] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.001 3.001 0 0112 20.4a3.001 3.001 0 01-2.121-.872l-.347-.347z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2D3436]">班級診斷摘要</h3>
            <p className="text-xs text-[#636E72]">根據本班診斷結果分析，提供該班學習狀況與具體行動建議</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InfoButton onClick={() => setInfoOpen(true)} />
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${health.color}`}>
            {health.label}
          </span>
        </div>
      </div>

      <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4 mb-4">
        <p className="text-sm text-[#2D3436] leading-relaxed">
          <span className="font-bold text-[#3D5A3E]">核心診斷：</span>
          {coreSentence}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-3">建議教學優先序列</p>
          {priorityNodes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {priorityNodes.map((node, idx) => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#3D5A3E] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-[#2D3436]">{node.name}</span>
                  </div>
                  {idx < priorityNodes.length - 1 && (
                    <svg className="w-3.5 h-3.5 text-[#95A5A6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#636E72]">無需優先補救的知識節點</p>
          )}
        </div>

        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-2">建議下一步行動</p>
          <p className="text-xs text-[#2D3436] leading-relaxed">{nextStep}</p>
        </div>
      </div>
      <InfoDrawer
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        config={CHART_INFO['ai-diagnosis-summary']}
        dynamicStatus={`目前班級狀態：${health.label}。${coreSentence}`}
      />
    </div>
  );
}

// ─── 本週行動清單 ─────────────────────────────────────────────────────────────
function WeeklyActionChecklist({ quizId, classId, totalStudents }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const misconStudents = getMisconceptionStudents(quizId, classId);
  const highFreqMiscons = Object.entries(misconStudents)
    .map(([id, students]) => ({ id, count: students.length, pct: Math.round((students.length / totalStudents) * 100) }))
    .filter(({ pct }) => pct >= 30)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#2D3436]">本週行動清單</h3>
          <InfoButton onClick={() => setInfoOpen(true)} />
        </div>
        <span className="text-xs text-[#95A5A6]">依緊急程度排序</span>
      </div>
      <p className="text-sm text-[#636E72] mb-4">針對高頻迷思（≥30% 學生持有）的具體補救行動，完成後可安排複測追蹤</p>

      {highFreqMiscons.length === 0 ? (
        <div className="bg-[#C8EAAE] rounded-2xl border border-[#BDC3C7] p-6 text-center">
          <p className="text-[#3D5A3E] font-semibold">班級表現良好，本週無高頻迷思需要補救！</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#BDC3C7] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {highFreqMiscons.map(({ id, pct }, idx) => {
            const node = knowledgeNodes.find(n => n.misconceptions.find(m => m.id === id));
            const miscon = node?.misconceptions.find(m => m.id === id);
            if (!node || !miscon) return null;
            const urgency = pct >= 60
              ? { label: '急需補救', color: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' }
              : pct >= 45
              ? { label: '建議補救', color: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
              : { label: '留意觀察', color: 'bg-[#FCF0C2] text-[#D4AC0D] border-[#F5D669]' };
            const prereqNames = node.prerequisites.map(pid => knowledgeNodes.find(n => n.id === pid)?.name).filter(Boolean);

            return (
              <div key={id} className={`bg-white px-5 py-4 ${idx < highFreqMiscons.length - 1 ? 'border-b border-[#D5D8DC]' : ''}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#3D5A3E] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${urgency.color}`}>{urgency.label} {pct}%</span>
                  <p className="text-sm font-semibold text-[#2D3436] flex-1 min-w-0 truncate">{miscon.label}</p>
                  <span className="text-xs text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">{node.name}</span>
                </div>
                <div className="flex items-start gap-2 ml-[34px]">
                  <span className="text-[#3D5A3E] font-bold text-sm flex-shrink-0 mt-0.5">→</span>
                  <p className="text-sm text-[#2D3436] leading-relaxed line-clamp-2">{node.teachingStrategy}</p>
                </div>
                {prereqNames.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 ml-[34px]">
                    <span className="text-xs text-[#636E72]">先備確認：</span>
                    {prereqNames.map(name => (
                      <span key={name} className="text-xs bg-[#FCF0C2] border border-[#F5D669] text-[#B7950B] px-2 py-0.5 rounded-full">{name}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="bg-[#EEF5E6] border-t border-[#D5D8DC] px-5 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-[#3D5A3E] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-[#2D3436] leading-relaxed">
              <span className="font-bold text-[#3D5A3E]">下週追蹤：</span>完成上述補救教學後，安排簡短複測確認迷思是否已澄清，再決定是否需要進一步介入。
            </p>
          </div>
        </div>
      )}
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['weekly-action-checklist']}
        dynamicStatus={`目前共有 ${highFreqMiscons.length} 個高頻迷思（持有率 ≥30%）需要教學介入，依緊急程度排列於下方清單。`} />
    </div>
  );
}

// ─── 迷思概念分佈 ─────────────────────────────────────────────────────────────
function MisconceptionDistribution({ quizId, classId, totalStudents }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [infoOpen, setInfoOpen] = useState(false);
  const misconStudents = getMisconceptionStudents(quizId, classId);

  const sorted = Object.entries(misconStudents)
    .map(([id, students]) => ({ id, students, pct: Math.round((students.length / totalStudents) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const toggle = (id) => setExpandedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">迷思概念分佈</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-4">依佔比由高至低排列，點擊「展開」可查看持有該迷思的學生名單</p>
      <div className="space-y-2">
        {sorted.map(({ id, students, pct }) => {
          const node = knowledgeNodes.find(n => n.misconceptions.find(m => m.id === id));
          const miscon = node?.misconceptions.find(m => m.id === id);
          const isExpanded = expandedIds.has(id);
          const urgencyColor = pct >= 50
            ? { bar: '#F28B95', badge: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' }
            : pct >= 30
            ? { bar: '#F4D03F', badge: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
            : { bar: '#BDC3C7', badge: 'bg-[#EEF5E6] text-[#636E72] border-[#D5D8DC]' };

          return (
            <div key={id} className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${urgencyColor.badge}`}>{pct}%</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D3436] truncate">{miscon?.label}</p>
                  <p className="text-xs text-[#95A5A6] truncate">{node?.name} · {id}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-28 bg-[#D5D8DC] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: urgencyColor.bar }} />
                  </div>
                  <span className="text-xs text-[#636E72] w-14 text-right">{students.length}/{totalStudents} 人</span>
                </div>
                <button onClick={() => toggle(id)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#636E72] hover:text-[#2D3436] transition-colors flex-shrink-0 border border-[#BDC3C7] bg-white rounded-xl px-2.5 py-1">
                  {isExpanded ? '收合' : `展開 ${students.length} 人`}
                  <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {isExpanded && (
                <div className="px-4 pb-3 pt-0 border-t border-[#D5D8DC] bg-white">
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {students.map(name => (
                      <span key={name} className="text-xs bg-[#EEF5E6] border border-[#D5D8DC] text-[#636E72] px-2.5 py-1 rounded-full">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['misconception-distribution']}
        dynamicStatus={`目前共偵測到 ${sorted.length} 種迷思概念。持有率最高的迷思為「${sorted[0]?.label ?? '—'}」（${sorted[0]?.pct ?? 0}%）。高頻迷思（≥30%）共 ${sorted.filter(m => m.pct >= 30).length} 種。`} />
    </div>
  );
}

// ─── 知識節點通過率圖 ─────────────────────────────────────────────────────────
function BreakdownChart({ quizId, classId }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const passRates = getNodePassRates(quizId, classId);
  const chartData = knowledgeNodes.filter(n => passRates[n.id] !== undefined)
    .map(node => ({ name: node.name, id: node.id, passRate: passRates[node.id] || 0 }));

  const rateValues = Object.values(passRates);
  const avgPassRate = rateValues.length > 0 ? Math.round(rateValues.reduce((s, v) => s + v, 0) / rateValues.length) : 0;
  const belowThreshold = rateValues.filter(r => r < 50).length;
  const breakdownStatus = `目前班級各概念平均答對率為 ${avgPassRate}%。${belowThreshold > 0 ? `共有 ${belowThreshold} 個概念答對率低於 50%，建議優先安排補救教學。` : '所有概念答對率均達 50% 以上，表現良好。'}`;

  const getBarColor = (rate) => rate >= 70 ? '#8FC87A' : rate >= 50 ? '#F4D03F' : '#F28B95';
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm">
          <p className="font-bold text-[#2D3436]">{d.name}</p>
          <p className="text-xs text-[#636E72] mb-1">{d.id}</p>
          <p className="font-semibold" style={{ color: getBarColor(d.passRate) }}>答對率：{d.passRate}%</p>
          <p className="text-xs text-[#95A5A6] mt-0.5">（答對人數 / 全班人數）</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">各概念掌握程度分析</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-2">每個概念對應一道診斷題，長條越高代表全班答對比例越高、掌握程度越佳</p>
      <div className="flex items-center gap-4 mb-4">
        {[{ color: '#8FC87A', label: '≥70% 多數學生掌握' }, { color: '#F4D03F', label: '50–69% 部分學生有迷思' }, { color: '#F28B95', label: '<50% 多數學生需補救' }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#636E72]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#636E72' }} angle={-15} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '70%', position: 'right', fontSize: 11, fill: '#95A5A6' }} />
            <Bar dataKey="passRate" radius={[8, 8, 0, 0]}>
              {chartData.map(entry => (<Cell key={entry.id} fill={getBarColor(entry.passRate)} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['breakdown-chart']} dynamicStatus={breakdownStatus} />
    </div>
  );
}

// ─── 題目明細矩陣 ─────────────────────────────────────────────────────────────
function HeatmapView({ quizId, classId, totalStudents }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const questions = getQuizQuestions(quizId);
  const rows = questions.map((q, qIdx) => {
    const node = knowledgeNodes.find(n => n.id === q.knowledgeNodeId);
    const stats = getQuestionStats(qIdx, quizId, classId);
    return { q, node, stats };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-base font-bold text-[#2D3436]">題目明細矩陣</h3>
          <p className="text-sm text-[#636E72] mt-0.5">各題選項作答分佈與迷思對應</p>
        </div>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-[#BDC3C7]">
        <table className="w-full text-sm bg-white" style={{ minWidth: '700px' }}>
          <thead>
            <tr className="bg-[#C8EAAE] border-b border-[#BDC3C7]">
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase">題目 / 知識節點</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 A</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 B</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 C</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">選項 D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5D8DC]">
            {rows.map(({ q, node, stats }) => (
              <tr key={q.id}>
                <td className="px-4 py-4 align-top" style={{ maxWidth: 220 }}>
                  <p className="text-xs font-mono text-[#95A5A6] mb-0.5">{node?.id}</p>
                  <p className="text-sm font-semibold text-[#2D3436] mb-1">{node?.name}</p>
                  <p className="text-xs text-[#636E72] leading-relaxed">{q.stem}</p>
                </td>
                {q.options.map(opt => {
                  const count = stats[opt.tag] || 0;
                  const pct = Math.round((count / totalStudents) * 100);
                  const isCorrect = opt.diagnosis === 'CORRECT';
                  const bgStyle = isCorrect
                    ? { backgroundColor: `rgba(167,214,150,${pct / 100 * 0.5 + 0.08})` }
                    : { backgroundColor: `rgba(242,139,149,${(isCorrect ? 0 : pct) / 100 * 0.6 + 0.05})` };
                  const misconLabel = isCorrect ? null : node?.misconceptions.find(m => m.id === opt.diagnosis)?.label;
                  return (
                    <td key={opt.tag} className="px-3 py-4 text-center align-top" style={bgStyle}>
                      <div className="font-bold text-lg text-[#2D3436]">{count}</div>
                      <div className="text-xs text-[#636E72] mb-1">{pct}% 學生</div>
                      {isCorrect ? (
                        <span className="text-xs font-semibold text-[#3D5A3E] bg-[#C8EAAE] border border-[#BDC3C7] px-2 py-0.5 rounded-full">正確答案</span>
                      ) : (
                        <span className="text-xs text-[#E74C5E] bg-[#FAC8CC] border border-[#F5B8BA] px-2 py-0.5 rounded-full leading-tight block mt-1">{misconLabel}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['heatmap-view']} />
    </div>
  );
}

// ─── 全年級診斷總覽（接受 overviewData prop）────────────────────────────────────
function OverallAIDiagnosisSummary({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { classStats } = overviewData;
  const avgCompletion = Math.round(classStats.reduce((s, c) => s + c.completionRate, 0) / classStats.length);
  const avgPassRate   = Math.round(classStats.reduce((s, c) => s + c.avgPassRate,   0) / classStats.length);
  const riskClasses   = classStats.filter(c => c.completionRate < 60 || c.avgPassRate < 50);
  const incompleteClasses = classStats.filter(c => c.completionRate < 100).sort((a, b) => a.completionRate - b.completionRate);

  const health = riskClasses.length === 0
    ? { label: '年級表現良好',  color: 'bg-[#C8EAAE] text-[#3D5A3E] border-[#8FC87A]' }
    : riskClasses.length <= 1
    ? { label: '部分班級需關注', color: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }
    : { label: '多班需要介入',   color: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' };

  const coreSentence = riskClasses.length === 0
    ? `全年級平均完成率 ${avgCompletion}%，平均掌握率 ${avgPassRate}%，整體學習情形穩定，建議維持現有教學節奏並規劃進階診斷。`
    : incompleteClasses.length > 0
    ? `${incompleteClasses.map(c => c.name).join('、')} 作答完成率偏低（最低 ${incompleteClasses[0].completionRate}%），全年級平均掌握率僅 ${avgPassRate}%，建議優先補齊作答後再進行概念補救。`
    : `全年級平均掌握率 ${avgPassRate}%，${riskClasses.map(c => c.name).join('、')} 高頻迷思嚴重，建議安排跨班補救資源。`;

  const nextStep = riskClasses.length === 0
    ? '可設計跨班交流活動，分享高通過率班級的學習策略，促進年級整體學習品質提升。'
    : incompleteClasses.length > 0
    ? '本週優先催繳未完成作答，待完成率達 80% 以上後，再統一分析各班迷思分佈，規劃補救教學。'
    : '建議本週針對風險班級安排概念補救課，同時追蹤高頻迷思改善情況，下週進行複測比較。';

  return (
    <div className="bg-white rounded-[32px] border border-[#8FC87A] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#3D5A3E] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.001 3.001 0 0112 20.4a3.001 3.001 0 01-2.121-.872l-.347-.347z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2D3436]">全年級診斷總覽</h3>
            <p className="text-xs text-[#636E72]">依各班診斷結果彙整學習狀況，提供跨班趨勢與優先介入順序</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InfoButton onClick={() => setInfoOpen(true)} />
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${health.color}`}>{health.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '全年級平均完成率', value: `${avgCompletion}%`, color: avgCompletion >= 80 ? 'text-[#3D5A3E]' : avgCompletion >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
          { label: '全年級平均掌握率', value: `${avgPassRate}%`,   color: avgPassRate  >= 70 ? 'text-[#3D5A3E]' : avgPassRate  >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
          { label: '需關注班級數',    value: `${riskClasses.length} 班`, color: riskClasses.length === 0 ? 'text-[#3D5A3E]' : riskClasses.length <= 1 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
        ].map(item => (
          <div key={item.label} className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-3 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-[#636E72] mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4 mb-4">
        <p className="text-sm text-[#2D3436] leading-relaxed"><span className="font-bold text-[#3D5A3E]">跨班診斷：</span>{coreSentence}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-3">優先介入順序</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {[...classStats].sort((a, b) => (a.completionRate + a.avgPassRate) - (b.completionRate + b.avgPassRate)).map((cls, idx) => (
              <div key={cls.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#3D5A3E] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</span>
                  <span className="text-xs font-semibold text-[#2D3436]">{cls.name}</span>
                  <span className="text-xs text-[#95A5A6]">({cls.completionRate}% / {cls.avgPassRate}%)</span>
                </div>
                {idx < classStats.length - 1 && (
                  <svg className="w-3.5 h-3.5 text-[#95A5A6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#95A5A6] mt-2">括號內：完成率 / 平均掌握率</p>
        </div>
        <div className="bg-[#EEF5E6] rounded-2xl border border-[#D5D8DC] p-4">
          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wide mb-2">年級層級行動建議</p>
          <p className="text-xs text-[#2D3436] leading-relaxed">{nextStep}</p>
        </div>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['overall-ai-summary']} />
    </div>
  );
}

// ─── 知識節點跨班比較圖 ───────────────────────────────────────────────────────
function CrossClassNodeChart({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { nodePassRates, classStats } = overviewData;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm">
          <p className="font-bold text-[#2D3436] mb-2">{label}</p>
          {payload.map(p => (
            <div key={p.dataKey} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} />
              <span className="text-[#636E72]">{p.name}：</span>
              <span className="font-semibold text-[#2D3436]">{p.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">知識節點跨班比較</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-2">同一概念節點，各班通過率並排比較，可快速找出年級共同弱點</p>
      <div className="flex items-center gap-4 mb-4">
        {classStats.map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-xs text-[#636E72]">{c.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-6 border-t-2 border-dashed border-[#95A5A6]" />
          <span className="text-xs text-[#95A5A6]">70% 掌握門檻</span>
        </div>
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={nodePassRates} margin={{ top: 10, right: 40, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#636E72' }} angle={-15} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '70%', position: 'right', fontSize: 11, fill: '#95A5A6' }} />
            {classStats.map(c => (
              <Bar key={c.id} dataKey={CLASS_KEY_MAP[c.id] ?? c.id} name={c.name} fill={c.color} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['cross-class-node-chart']} />
    </div>
  );
}

// ─── 跨班高頻迷思 Top N ──────────────────────────────────────────────────────
function TopMisconceptionsChart({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { topMisconceptions, classStats } = overviewData;
  const sorted = [...topMisconceptions].sort((a, b) => b.avg - a.avg);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      const item = sorted.find(m => m.label === label);
      return (
        <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm" style={{ maxWidth: 220 }}>
          <p className="font-bold text-[#2D3436] mb-1 text-xs leading-snug">{label}</p>
          <p className="text-xs text-[#95A5A6] mb-2">{item?.node}</p>
          {classStats.map(c => {
            const key = CLASS_KEY_MAP[c.id] ?? c.id;
            return (
              <div key={c.id} className="flex items-center gap-2 text-xs mb-0.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-[#636E72]">{c.name}：{item?.[key] ?? 0}%</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (avg) => avg >= 45 ? '#F28B95' : avg >= 30 ? '#F4D03F' : '#BDC3C7';

  if (sorted.length === 0) {
    return (
      <div>
        <h3 className="text-base font-bold text-[#2D3436] mb-2">跨班高頻迷思</h3>
        <div className="bg-[#C8EAAE] rounded-2xl border border-[#BDC3C7] p-6 text-center">
          <p className="text-[#3D5A3E] font-semibold">無顯著高頻迷思</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">跨班高頻迷思 Top {sorted.length}</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-4">依全年級平均持有率由高至低排列，找出需年級層級教學策略的迷思</p>
      <div className="flex items-center gap-4 mb-4">
        {[{ color: '#F28B95', label: '≥45% 急需年級補救' }, { color: '#F4D03F', label: '30–44% 建議關注' }, { color: '#BDC3C7', label: '<30% 低風險' }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#636E72]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 60, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" horizontal={false} />
            <XAxis type="number" domain={[0, 70]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#636E72' }} width={140} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg" name="全年級平均" radius={[0, 6, 6, 0]}>
              {sorted.map(entry => (<Cell key={entry.id} fill={getBarColor(entry.avg)} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['top-misconceptions-chart']} />
    </div>
  );
}

// ─── 班級 × 迷思熱力圖 ──────────────────────────────────────────────────────
function ClassMisconceptionHeatmap({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { topMisconceptions, classStats } = overviewData;
  const sorted = [...topMisconceptions].sort((a, b) => b.avg - a.avg);
  const classKeys = classStats.map(c => ({ key: CLASS_KEY_MAP[c.id] ?? c.id, id: c.id }));

  const getCellBg = (pct) => {
    if (pct >= 50) return { bg: 'rgba(242,139,149,0.75)', text: '#C0392B' };
    if (pct >= 35) return { bg: 'rgba(242,139,149,0.45)', text: '#E74C5E' };
    if (pct >= 20) return { bg: 'rgba(244,208,63,0.55)',  text: '#B7950B' };
    return { bg: 'rgba(200,234,174,0.45)', text: '#3D5A3E' };
  };

  if (sorted.length === 0) return null;

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">班級 × 迷思熱力圖</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-3">顏色越深表示持有該迷思的學生比例越高，一眼找出哪個班在哪個迷思特別嚴重</p>
      <div className="flex items-center gap-4 mb-4">
        {[{ color: 'rgba(242,139,149,0.75)', label: '≥50% 嚴重' }, { color: 'rgba(242,139,149,0.45)', label: '35–49% 偏高' }, { color: 'rgba(244,208,63,0.55)', label: '20–34% 留意' }, { color: 'rgba(200,234,174,0.45)', label: '<20% 低風險' }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-[#BDC3C7] flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#636E72]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#BDC3C7]">
        <table className="w-full text-sm bg-white" style={{ minWidth: 560 }}>
          <thead>
            <tr className="bg-[#C8EAAE] border-b border-[#BDC3C7]">
              <th className="px-4 py-3 text-left text-xs font-bold text-[#636E72] uppercase">迷思概念</th>
              <th className="px-3 py-3 text-xs font-bold text-[#636E72] uppercase">知識節點</th>
              {classStats.map(c => (<th key={c.id} className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">{c.name}</th>))}
              <th className="px-4 py-3 text-center text-xs font-bold text-[#636E72] uppercase">年級平均</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5D8DC]">
            {sorted.map(item => {
              const avgStyle = getCellBg(item.avg);
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-[#2D3436]">{item.label}</p>
                    <p className="text-[10px] text-[#95A5A6] font-mono">{item.id}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs text-[#636E72] bg-[#EEF5E6] border border-[#D5D8DC] px-2 py-0.5 rounded-full whitespace-nowrap">{item.node}</span>
                  </td>
                  {classKeys.map(({ key, id }) => {
                    const pct = item[key] ?? 0;
                    const style = getCellBg(pct);
                    return (
                      <td key={id} className="px-4 py-3 text-center" style={{ backgroundColor: style.bg }}>
                        <span className="text-sm font-bold" style={{ color: style.text }}>{pct}%</span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center" style={{ backgroundColor: avgStyle.bg }}>
                    <span className="text-sm font-bold" style={{ color: avgStyle.text }}>{item.avg}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['class-misconception-heatmap']} />
    </div>
  );
}

// ─── 各班學習狀況總覽（卡片）─────────────────────────────────────────────────
function ClassStatusCards({ overviewData, onSelectClass }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { classStats } = overviewData;

  const getStatus = (cls) => {
    const good = cls.completionRate >= 60 && cls.avgPassRate >= 50;
    const bad  = cls.completionRate < 60 && cls.avgPassRate < 50;
    if (good) return { label: '表現良好', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]', border: 'border-[#8FC87A]' };
    if (bad)  return { label: '需要介入', color: 'text-[#E74C5E]', bg: 'bg-[#FAC8CC]', border: 'border-[#F5B8BA]' };
    return           { label: '需要關注', color: 'text-[#B7950B]', bg: 'bg-[#FCF0C2]', border: 'border-[#F5D669]' };
  };

  const metrics = [
    { key: 'completionRate', label: '完成率', unit: '%', color: (v) => v >= 80 ? 'text-[#3D5A3E]' : v >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
    { key: 'avgPassRate', label: '掌握率', unit: '%', color: (v) => v >= 70 ? 'text-[#3D5A3E]' : v >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
    { key: 'highFreqMisconCount', label: '高頻迷思', unit: ' 個', color: (v) => v === 0 ? 'text-[#3D5A3E]' : v <= 2 ? 'text-[#B7950B]' : 'text-[#E74C5E]' },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-bold text-[#2D3436]">各班學習狀況總覽</h3>
          <p className="text-sm text-[#636E72] mt-0.5">三項核心指標一覽，快速掌握各班現況與介入優先序</p>
        </div>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <div className={`grid gap-4 mt-4`} style={{ gridTemplateColumns: `repeat(${classStats.length}, 1fr)` }}>
        {classStats.map((cls) => {
          const status = getStatus(cls);
          return (
            <div key={cls.id} onClick={() => onSelectClass(cls.id)}
              className="bg-white rounded-2xl border border-[#BDC3C7] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-pointer hover:border-[#8FC87A] hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                <span className="text-base font-bold text-[#2D3436]">{cls.name}</span>
              </div>
              <div className="space-y-3 mb-4">
                {metrics.map((m) => { const val = cls[m.key]; return (
                  <div key={m.key} className="flex items-center justify-between">
                    <span className="text-sm text-[#636E72]">{m.label}</span>
                    <span className={`text-sm font-bold ${m.color(val)}`}>{val}{m.unit}</span>
                  </div>
                ); })}
              </div>
              <div className={`rounded-xl px-3 py-2 border text-center ${status.bg} ${status.border}`}>
                <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-xs text-[#95A5A6] text-center mt-3">點擊查看詳細報告 →</p>
            </div>
          );
        })}
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['class-status-cards']} />
    </div>
  );
}

// ─── 班級完成率 vs 掌握率散佈圖 ──────────────────────────────────────────────
function ClassScatterChart({ overviewData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { classStats } = overviewData;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0]?.payload;
      if (!d) return null;
      return (
        <div className="bg-white border border-[#BDC3C7] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-3 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="font-bold text-[#2D3436]">{d.name}</span>
          </div>
          <div className="space-y-0.5 text-xs text-[#636E72]">
            <p>掌握率：<span className="font-semibold text-[#2D3436]">{d.x}%</span></p>
            <p>完成率：<span className="font-semibold text-[#2D3436]">{d.y}%</span></p>
            <p>高頻迷思：<span className="font-semibold text-[#2D3436]">{d.miscon} 個</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill={payload.color} fillOpacity={0.9} stroke="white" strokeWidth={2} />
        <text x={cx} y={cy - 16} textAnchor="middle" fontSize={11} fill="#2D3436" fontWeight="600">{payload.name}</text>
      </g>
    );
  };

  const scatterData = classStats.map(c => ({ name: c.name, x: c.avgPassRate, y: c.completionRate, color: c.color, miscon: c.highFreqMisconCount }));

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-[#2D3436]">完成率 × 掌握率 班級分布</h3>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <p className="text-sm text-[#636E72] mb-3">右上角 = 作答完整且掌握良好；左下角 = 優先介入</p>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {[{ label: '右上：表現良好', cls: 'bg-[#C8EAAE] text-[#3D5A3E] border-[#8FC87A]' }, { label: '左下：優先介入', cls: 'bg-[#FAC8CC] text-[#E74C5E] border-[#F5B8BA]' }, { label: '其他：需要關注', cls: 'bg-[#FCF0C2] text-[#B7950B] border-[#F5D669]' }].map(q => (
          <span key={q.label} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${q.cls}`}>{q.label}</span>
        ))}
      </div>
      <div className="bg-[#EEF5E6] border border-[#BDC3C7] rounded-2xl p-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 40, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C8EAAE" />
            <XAxis type="number" dataKey="x" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }}
              label={{ value: '掌握率', position: 'insideBottom', offset: -14, fontSize: 11, fill: '#636E72' }} />
            <YAxis type="number" dataKey="y" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#636E72' }}
              label={{ value: '完成率', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: '#636E72' }} />
            <ZAxis range={[100, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={50} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '50%', position: 'top', fontSize: 10, fill: '#95A5A6' }} />
            <ReferenceLine y={60} stroke="#95A5A6" strokeDasharray="4 4" label={{ value: '60%', position: 'right', fontSize: 10, fill: '#95A5A6' }} />
            <Scatter data={scatterData} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <InfoDrawer isOpen={infoOpen} onClose={() => setInfoOpen(false)} config={CHART_INFO['class-scatter-chart']} />
    </div>
  );
}

// ─── 全部班級總覽（支援考卷切換）────────────────────────────────────────────
function AllClassesOverview({ classes, assignments, quizzes, selectedQuizId, onSelectClassWithQuiz }) {
  const [completionInfoOpen, setCompletionInfoOpen] = useState(false);

  const overviewData = selectedQuizId
    ? computeOverviewForQuiz(selectedQuizId, classes, assignments)
    : null;

  if (!overviewData || overviewData.classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <div className="w-16 h-16 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-[#636E72] font-medium mb-1">此考卷尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此考卷派發給班級</p>
      </div>
    );
  }

  const { classStats } = overviewData;
  const avgCompletion = Math.round(classStats.reduce((s, c) => s + c.completionRate, 0) / classStats.length);
  const avgPassRate   = Math.round(classStats.reduce((s, c) => s + c.avgPassRate,   0) / classStats.length);
  const riskCount     = classStats.filter(c => c.completionRate < 60 || c.avgPassRate < 50).length;

  const filteredAssignments = selectedQuizId
    ? assignments.filter(a => a.quizId === selectedQuizId)
    : assignments;

  return (
    <div className="space-y-6">
      <OverallAIDiagnosisSummary overviewData={overviewData} />

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '涵蓋班級', value: `${classStats.length} 個`, sub: '已派發此考卷的班級', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]' },
          { label: '平均完成率', value: `${avgCompletion}%`, sub: '各班作答完成率平均', color: avgCompletion >= 80 ? 'text-[#3D5A3E]' : avgCompletion >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]', bg: avgCompletion >= 80 ? 'bg-[#C8EAAE]' : avgCompletion >= 60 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]' },
          { label: '平均掌握率', value: `${avgPassRate}%`, sub: '各班概念平均通過率', color: avgPassRate >= 70 ? 'text-[#3D5A3E]' : avgPassRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]', bg: avgPassRate >= 70 ? 'bg-[#C8EAAE]' : avgPassRate >= 50 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]' },
          { label: '需關注班級', value: `${riskCount} 班`, sub: '完成率<60% 或掌握率<50%', color: riskCount === 0 ? 'text-[#3D5A3E]' : riskCount <= 1 ? 'text-[#B7950B]' : 'text-[#E74C5E]', bg: riskCount === 0 ? 'bg-[#C8EAAE]' : riskCount <= 1 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-[#BDC3C7] p-4 ${s.bg} shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}>
            <p className={`text-2xl font-bold ${s.color} mb-0.5`}>{s.value}</p>
            <p className="text-sm font-semibold text-[#2D3436]">{s.label}</p>
            <p className="text-xs text-[#636E72] mt-0.5 leading-snug">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <ClassStatusCards overviewData={overviewData} onSelectClass={(classId) => {
          const latestQuizId = getLatestQuizIdForClass(assignments.filter(a => selectedQuizId ? a.quizId === selectedQuizId : true), classId);
          onSelectClassWithQuiz(classId, latestQuizId ?? selectedQuizId);
        }} />
      </div>

      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <CrossClassNodeChart overviewData={overviewData} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <TopMisconceptionsChart overviewData={overviewData} />
        </div>
        <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <ClassScatterChart overviewData={overviewData} />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <ClassMisconceptionHeatmap overviewData={overviewData} />
      </div>

      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-bold text-[#2D3436]">各班派題完成率</h3>
          <InfoButton onClick={() => setCompletionInfoOpen(true)} />
        </div>
        <p className="text-sm text-[#636E72] mb-5">點擊班級名稱可查看該班詳細診斷報告</p>
        <div className="space-y-4">
          {classes.map(cls => {
            const clsAssignments = filteredAssignments.filter(a => a.classId === cls.id);
            if (clsAssignments.length === 0) {
              return (
                <div key={cls.id} className="flex items-center gap-4 p-4 rounded-2xl border border-[#D5D8DC] bg-[#EEF5E6]">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#2D3436]">{cls.name}</p>
                    <p className="text-xs text-[#95A5A6] mt-0.5">尚未派發此考卷</p>
                  </div>
                  <span className="text-xs text-[#95A5A6] border border-[#D5D8DC] px-2 py-1 rounded-full">未派題</span>
                </div>
              );
            }
            return clsAssignments.map(a => {
              const quiz = quizzes.find(q => q.id === a.quizId);
              const barColor = a.completionRate === 100 ? '#8FC87A' : a.completionRate >= 50 ? '#F4D03F' : '#F28B95';
              return (
                <div key={a.id} className="p-4 rounded-2xl border border-[#D5D8DC] bg-white hover:bg-[#EEF5E6] transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onSelectClassWithQuiz(cls.id, a.quizId)}
                          className="text-sm font-semibold text-[#2D3436] hover:text-[#3D5A3E] hover:underline transition-colors">
                          {cls.name}
                        </button>
                        <span className="text-xs text-[#95A5A6]">·</span>
                        <span className="text-xs text-[#636E72]">{quiz?.title ?? a.quizId}</span>
                      </div>
                      <p className="text-xs text-[#95A5A6] mt-0.5">派題日：{a.assignedAt}　截止日：{a.dueDate}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-[#2D3436]">{a.completionRate}%</p>
                      <p className="text-xs text-[#95A5A6]">{a.submittedCount}/{a.totalStudents} 人</p>
                    </div>
                  </div>
                  <div className="w-full bg-[#D5D8DC] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${a.completionRate}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            });
          })}
        </div>
        <InfoDrawer isOpen={completionInfoOpen} onClose={() => setCompletionInfoOpen(false)} config={CHART_INFO['all-classes-completion']} />
      </div>
    </div>
  );
}

// ─── 單一班級報告（嚴格使用當前 quizId + classId 的 assignment）──────────────
function SingleClassReport({ cls, assignments, quizzes, quizId }) {
  const classId = cls.id;
  const classAnswersData = getClassAnswers(quizId, classId);
  const totalStudents = classAnswersData.length;

  const selectedAssignment = getAssignment(assignments, classId, quizId);
  const hasData = selectedAssignment && selectedAssignment.completionRate > 0 && totalStudents > 0;

  if (!hasData) {
    const quizTitle = quizzes.find(q => q.id === quizId)?.title ?? '此考卷';
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <div className="w-16 h-16 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-[#636E72] font-medium mb-1">尚無作答資料</p>
        <p className="text-sm text-[#95A5A6]">{cls.name}「{quizTitle}」目前沒有學生已完成作答，請至派題管理確認派題狀態</p>
      </div>
    );
  }

  const [statInfoKey, setStatInfoKey] = useState(null);
  const misconStudents = getMisconceptionStudents(quizId, classId);
  const passRates = getNodePassRates(quizId, classId);
  const avgPassRate = Math.round(Object.values(passRates).reduce((s, v) => s + v, 0) / Object.values(passRates).length);

  const topMisconEntry = Object.entries(misconStudents)
    .map(([id, s]) => ({ id, pct: Math.round((s.length / totalStudents) * 100) }))
    .sort((a, b) => b.pct - a.pct)[0];
  const topMisconNode = knowledgeNodes.find(n => n.misconceptions.find(m => m.id === topMisconEntry?.id));
  const topMisconLabel = topMisconNode?.misconceptions.find(m => m.id === topMisconEntry?.id)?.label;

  const completionRate = selectedAssignment.completionRate;
  const submittedCount = selectedAssignment.submittedCount;
  const totalStudentsAssign = selectedAssignment.totalStudents;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '參與學生', value: `${totalStudents} 人`, sub: '已完成診斷測驗', color: 'text-[#3D5A3E]', bg: 'bg-[#C8EAAE]',
            infoKey: 'stat-card-participants', dynamicStatus: `目前有 ${totalStudents} 位學生已完成本次診斷測驗並提交作答。` },
          { label: '作答完成率', value: `${completionRate}%`, sub: `${submittedCount} / ${totalStudentsAssign} 人已提交`,
            color: completionRate === 100 ? 'text-[#3D5A3E]' : completionRate >= 60 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
            bg: completionRate === 100 ? 'bg-[#C8EAAE]' : completionRate >= 60 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]',
            infoKey: 'stat-card-completion', dynamicStatus: `目前班級作答完成率為 ${completionRate}%（${submittedCount}/${totalStudentsAssign} 人已提交）。${completionRate < 80 ? '完成率偏低，建議補齊作答後再解讀診斷報告。' : '完成率良好，診斷結果具代表性。'}` },
          { label: '概念平均掌握率', value: `${avgPassRate}%`, sub: '全班各概念平均答對率',
            color: avgPassRate >= 70 ? 'text-[#3D5A3E]' : avgPassRate >= 50 ? 'text-[#B7950B]' : 'text-[#E74C5E]',
            bg: avgPassRate >= 70 ? 'bg-[#C8EAAE]' : avgPassRate >= 50 ? 'bg-[#FCF0C2]' : 'bg-[#FAC8CC]',
            infoKey: 'stat-card-mastery', dynamicStatus: `目前班級 5 個知識節點的平均答對率為 ${avgPassRate}%。${avgPassRate >= 70 ? '整體表現良好。' : avgPassRate >= 50 ? '整體表現中等，建議針對低答對率節點進行補強。' : '整體掌握不足，建議安排系統性補救教學。'}` },
          { label: '最高風險迷思', value: topMisconEntry ? `${topMisconEntry.pct}%` : '—', sub: topMisconLabel ?? '無高頻迷思',
            color: topMisconEntry && topMisconEntry.pct >= 30 ? 'text-[#E74C5E]' : 'text-[#3D5A3E]',
            bg: topMisconEntry && topMisconEntry.pct >= 30 ? 'bg-[#FAC8CC]' : 'bg-[#C8EAAE]',
            infoKey: 'stat-card-top-misconception',
            dynamicStatus: topMisconEntry
              ? `目前持有率最高的迷思為「${topMisconLabel}」，持有率 ${topMisconEntry.pct}%（${Math.round(topMisconEntry.pct / 100 * totalStudents)} 位學生）。${topMisconEntry.pct >= 30 ? '已達高頻迷思門檻，建議優先安排補救。' : '持有率低於 30%，暫不需要緊急介入。'}`
              : '目前無偵測到任何迷思。' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-[#BDC3C7] p-4 ${s.bg} shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}>
            <div className="flex items-start justify-between mb-0.5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <InfoButton onClick={() => setStatInfoKey(s.infoKey)} />
            </div>
            <p className="text-sm font-semibold text-[#2D3436]">{s.label}</p>
            <p className="text-xs text-[#636E72] mt-0.5 leading-snug">{s.sub}</p>
          </div>
        ))}
      </div>
      <InfoDrawer isOpen={statInfoKey !== null} onClose={() => setStatInfoKey(null)}
        config={statInfoKey ? CHART_INFO[statInfoKey] : null}
        dynamicStatus={statInfoKey ? [
          { infoKey: 'stat-card-participants', dynamicStatus: `目前有 ${totalStudents} 位學生已完成本次診斷測驗並提交作答。` },
          { infoKey: 'stat-card-completion', dynamicStatus: `目前班級作答完成率為 ${completionRate}%（${submittedCount}/${totalStudentsAssign} 人已提交）。${completionRate < 80 ? '完成率偏低，建議補齊作答後再解讀診斷報告。' : '完成率良好，診斷結果具代表性。'}` },
          { infoKey: 'stat-card-mastery', dynamicStatus: `目前班級 5 個知識節點的平均答對率為 ${avgPassRate}%。${avgPassRate >= 70 ? '整體表現良好。' : avgPassRate >= 50 ? '整體表現中等，建議針對低答對率節點進行補強。' : '整體掌握不足，建議安排系統性補救教學。'}` },
          { infoKey: 'stat-card-top-misconception', dynamicStatus: topMisconEntry ? `目前持有率最高的迷思為「${topMisconLabel}」，持有率 ${topMisconEntry.pct}%。${topMisconEntry.pct >= 30 ? '已達高頻迷思門檻，建議優先安排補救。' : '持有率低於 30%，暫不需要緊急介入。'}` : '目前無偵測到任何迷思。' },
        ].find(item => item.infoKey === statInfoKey)?.dynamicStatus : undefined} />

      <AIDiagnosisSummary quizId={quizId} classId={classId} totalStudents={totalStudents} />
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <WeeklyActionChecklist quizId={quizId} classId={classId} totalStudents={totalStudents} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <BreakdownChart quizId={quizId} classId={classId} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <MisconceptionDistribution quizId={quizId} classId={classId} totalStudents={totalStudents} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <HeatmapView quizId={quizId} classId={classId} totalStudents={totalStudents} />
      </div>
    </div>
  );
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function DashboardReport() {
  const { classes, currentClassId, setCurrentClassId, currentQuizId, setCurrentQuizId, assignments, quizzes } = useApp();
  const [localClassId, setLocalClassId] = useState(currentClassId);
  const [localQuizId, setLocalQuizId] = useState(currentQuizId);

  const currentClass = classes.find(c => c.id === localClassId) ?? null;

  const availableQuizzes = localClassId
    ? getAvailableQuizzesForClass(assignments, quizzes, localClassId)
    : getAllAssignedQuizzes(assignments, quizzes);

  const effectiveQuizId = localQuizId && availableQuizzes.some(q => q.id === localQuizId)
    ? localQuizId
    : availableQuizzes[0]?.id ?? null;

  const handleClassChange = (classId) => {
    setLocalClassId(classId || null);
    setCurrentClassId(classId || null);
    if (classId) {
      const latestQuiz = getLatestQuizIdForClass(assignments, classId);
      setLocalQuizId(latestQuiz);
      setCurrentQuizId(latestQuiz);
    } else {
      const firstQuiz = availableQuizzes[0]?.id ?? null;
      setLocalQuizId(firstQuiz);
      setCurrentQuizId(firstQuiz);
    }
  };

  const handleQuizChange = (quizId) => {
    setLocalQuizId(quizId || null);
    setCurrentQuizId(quizId || null);
  };

  const handleSelectClassWithQuiz = (classId, quizId) => {
    setLocalClassId(classId);
    setCurrentClassId(classId);
    setLocalQuizId(quizId);
    setCurrentQuizId(quizId);
  };

  const selectedQuizTitle = quizzes.find(q => q.id === effectiveQuizId)?.title;

  return (
    <TeacherLayout>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3436]">診斷結果</h1>
            <p className="text-[#636E72] mt-1 text-sm">
              {currentClass
                ? `${currentClass.name} · ${selectedQuizTitle ?? '迷思概念診斷'}`
                : selectedQuizTitle
                ? `全部班級 · ${selectedQuizTitle}`
                : '全部班級 · 派題完成率與診斷總覽'}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#636E72] font-medium">查看班級</span>
              <div className="relative">
                <select value={localClassId ?? ''} onChange={e => handleClassChange(e.target.value)}
                  className="appearance-none bg-white border border-[#BDC3C7] rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer">
                  <option value="">全部班級</option>
                  {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636E72] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {availableQuizzes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#636E72] font-medium">查看考卷</span>
                <div className="relative">
                  <select value={effectiveQuizId ?? ''} onChange={e => handleQuizChange(e.target.value)}
                    className="appearance-none bg-white border border-[#BDC3C7] rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer">
                    {availableQuizzes.map(q => (<option key={q.id} value={q.id}>{q.title}</option>))}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636E72] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {currentClass === null ? (
          <AllClassesOverview
            classes={classes}
            assignments={assignments}
            quizzes={quizzes}
            selectedQuizId={effectiveQuizId}
            onSelectClassWithQuiz={handleSelectClassWithQuiz}
          />
        ) : (
          <SingleClassReport
            cls={currentClass}
            assignments={assignments}
            quizzes={quizzes}
            quizId={effectiveQuizId}
          />
        )}
      </div>
    </TeacherLayout>
  );
}
