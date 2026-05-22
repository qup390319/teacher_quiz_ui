import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../../../../lib/api';
import { CAUSE_CATEGORIES } from '../../../../data/misconceptionCauses';

const CAUSE_HEX = {
  blue:   '#5DADE2',
  pink:   '#F28B95',
  green:  '#76B563',
  yellow: '#F4D03F',
  mint:   '#48C9B0',
  purple: '#A569BD',
  gray:   '#95A5A6',
};

export default function MisconceptionCauseDonut({ overviewData, classes, quizId }) {
  const targetClasses = (overviewData?.classStats ?? []).map((c) =>
    classes.find((cl) => cl.id === c.id),
  ).filter(Boolean);

  const followupsQueries = useQueries({
    queries: targetClasses.map((c) => ({
      queryKey: ['followups', quizId, c.id],
      queryFn: () => api.get(`/quizzes/${quizId}/followups?classId=${encodeURIComponent(c.id)}`),
      enabled: !!quizId && !!c.id,
    })),
  });

  const { data, total, loading, totalRows } = useMemo(() => {
    const isLoading = followupsQueries.some((q) => q.isLoading);
    const counts = new Map();
    let rowCount = 0;
    let causeCount = 0;
    followupsQueries.forEach((q) => {
      const rows = q.data?.rows ?? [];
      rowCount += rows.length;
      rows.forEach((r) => {
        if (r.finalStatus !== 'MISCONCEPTION') return;
        const ids = Array.isArray(r.causeIds) ? r.causeIds : [];
        ids.forEach((id) => {
          counts.set(id, (counts.get(id) ?? 0) + 1);
          causeCount++;
        });
      });
    });
    const rows = CAUSE_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      color: CAUSE_HEX[c.color] ?? '#95A5A6',
      value: counts.get(c.id) ?? 0,
    })).filter((r) => r.value > 0);
    return { data: rows, total: causeCount, loading: isLoading, totalRows: rowCount };
  }, [followupsQueries]);

  if (loading) {
    return <p className="text-sm text-[#95A5A6]">載入迷思成因分類中…</p>;
  }

  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#2D3436] mb-2">迷思成因分類</h3>
        <p className="text-sm text-[#95A5A6]">
          {totalRows === 0 ? '此題組尚無追問對話紀錄' : '追問結果尚未標註成因分類'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold text-[#2D3436]">迷思成因分類</h3>
        <span className="text-sm text-[#95A5A6]">
          所有班級追問結果中各類成因的標註次數（共 {total} 次標註）
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((d) => (<Cell key={d.id} fill={d.color} />))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} 次`, n]} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 13 }}
                formatter={(value) => value.length > 10 ? value.slice(0, 10) + '…' : value}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-sm">
          {data.sort((a, b) => b.value - a.value).map((d) => {
            const pct = Math.round((d.value / total) * 100);
            return (
              <li key={d.id} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[#2D3436] flex-1 truncate">{d.name}</span>
                <span className="font-bold text-[#2D3436] w-10 text-right">{d.value} 次</span>
                <span className="text-[#636E72] w-10 text-right">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
