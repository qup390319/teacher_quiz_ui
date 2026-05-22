import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { api } from '../../../../lib/api';
import { useQuiz } from '../../../../hooks/useQuizzes';
import { CLASS_CHART_COLORS, CLASS_KEY_MAP } from './helpers';

const BINS = [
  { key: '0-20',   min: 0,  max: 20,  label: '0–20%' },
  { key: '20-40',  min: 20, max: 40,  label: '20–40%' },
  { key: '40-60',  min: 40, max: 60,  label: '40–60%' },
  { key: '60-80',  min: 60, max: 80,  label: '60–80%' },
  { key: '80-100', min: 80, max: 101, label: '80–100%' },
];

function binIndex(pct) {
  if (pct < 20) return 0;
  if (pct < 40) return 1;
  if (pct < 60) return 2;
  if (pct < 80) return 3;
  return 4;
}

function computeStudentMastery(rows, correctTagByQuestion) {
  const totalQ = Object.keys(correctTagByQuestion).length;
  if (totalQ === 0) return [];
  return rows.map((r) => {
    const correct = (r.answers ?? []).filter(
      (a) => correctTagByQuestion[a.questionId] && a.selectedTag === correctTagByQuestion[a.questionId],
    ).length;
    return { studentId: r.studentId, name: r.studentName, mastery: Math.round((correct / totalQ) * 100) };
  });
}

export default function MasteryDistributionHistogram({ overviewData, classes, quizId }) {
  const { data: quiz } = useQuiz(quizId);
  const targetClasses = (overviewData?.classStats ?? []).map((c) =>
    classes.find((cl) => cl.id === c.id),
  ).filter(Boolean);

  const answersQueries = useQueries({
    queries: targetClasses.map((c) => ({
      queryKey: ['answers', quizId, c.id],
      queryFn: () => api.get(`/quizzes/${quizId}/answers?classId=${encodeURIComponent(c.id)}`),
      enabled: !!quizId && !!c.id,
    })),
  });

  const { chartData, summary, loading } = useMemo(() => {
    const isLoading = answersQueries.some((q) => q.isLoading) || !quiz;
    if (isLoading) return { chartData: [], summary: [], loading: true };

    const correctTagByQuestion = {};
    (quiz?.questions ?? []).forEach((q) => {
      const correct = q.options.find((o) => o.diagnosis === 'CORRECT');
      if (correct) correctTagByQuestion[q.id] = correct.tag;
    });

    const perClassStudents = answersQueries.map((q, i) => ({
      classId: targetClasses[i].id,
      className: targetClasses[i].name,
      students: computeStudentMastery(q.data?.rows ?? [], correctTagByQuestion),
    }));

    const rows = BINS.map((b) => {
      const row = { bin: b.label };
      perClassStudents.forEach((pc) => {
        const key = CLASS_KEY_MAP[pc.classId] ?? `cls_${pc.classId.replace(/[^a-zA-Z0-9]/g, '_')}`;
        row[key] = pc.students.filter((s) => binIndex(s.mastery) === BINS.indexOf(b)).length;
        row[`${key}__name`] = pc.className;
      });
      return row;
    });

    const sum = perClassStudents.map((pc) => {
      const masteries = pc.students.map((s) => s.mastery);
      const avg = masteries.length
        ? Math.round(masteries.reduce((s, v) => s + v, 0) / masteries.length)
        : 0;
      const low = masteries.filter((m) => m < 40).length;
      return { classId: pc.classId, className: pc.className, count: masteries.length, avg, low };
    });

    return { chartData: rows, summary: sum, loading: false };
  }, [answersQueries, quiz, targetClasses]);

  if (loading) {
    return <p className="text-sm text-[#95A5A6]">載入學生作答資料中…</p>;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold text-[#2D3436]">學生答對率分布</h3>
        <span className="text-sm text-[#95A5A6]">把每位學生的答對率（答對題數 ÷ 總題數）分成 5 個區間</span>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
            <XAxis dataKey="bin" tick={{ fontSize: 13, fill: '#636E72' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: '#636E72' }} />
            <Tooltip
              formatter={(value, name, props) => {
                const cls = props.payload[`${name}__name`] ?? name;
                return [`${value} 人`, cls];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }}
              formatter={(value, entry) => {
                const cls = chartData[0]?.[`${entry.dataKey}__name`] ?? value;
                return cls;
              }}
            />
            {summary.map((s) => {
              const key = CLASS_KEY_MAP[s.classId] ?? `cls_${s.classId.replace(/[^a-zA-Z0-9]/g, '_')}`;
              const color = CLASS_CHART_COLORS[s.classId] || '#BDC3C7';
              return (
                <Bar key={s.classId} dataKey={key} fill={color} radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {chartData.map((_, i) => (<Cell key={i} fill={color} />))}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {summary.map((s) => (
          <div key={s.classId} className="bg-[#FAFBFC] rounded-lg p-2 text-center">
            <p className="text-sm text-[#636E72]">{s.className}</p>
            <p className="text-base font-bold text-[#2D3436]">平均 {s.avg}%</p>
            <p className="text-[15px] text-[#E74C5E]">{s.low} 人 &lt;40%（需關注）</p>
          </div>
        ))}
      </div>
    </div>
  );
}
