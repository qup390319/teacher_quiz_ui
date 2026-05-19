import { useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CLASS_CHART_COLORS, CLASS_KEY_MAP } from './helpers';

const SUBJECT_AXES = [
  { key: 'subjectA', label: '溶解（子主題 A）', prefix: 'INe-II-3' },
  { key: 'subjectB', label: '酸鹼（子主題 B）', prefix: 'INe-Ⅲ-5' },
];

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

function buildRadarData(nodePassRates, classStats) {
  return SUBJECT_AXES.map((axis) => {
    const row = { subject: axis.label };
    const matched = nodePassRates.filter((n) => n.id.startsWith(axis.prefix));
    classStats.forEach((c) => {
      const key = CLASS_KEY_MAP[c.id] ?? `cls_${c.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const values = matched.map((n) => n[key] ?? 0);
      row[key] = avg(values);
      row[`${key}__name`] = c.name;
    });
    row.__matchedCount = matched.length;
    return row;
  });
}

export default function SubjectRadarChart({ overviewData }) {
  const { classStats, nodePassRates } = overviewData;

  const data = useMemo(
    () => buildRadarData(nodePassRates, classStats),
    [nodePassRates, classStats],
  );

  const hasAnyData = data.some((row) => row.__matchedCount > 0);
  if (!hasAnyData) {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#2D3436] mb-3">子主題掌握度比較（雷達）</h3>
        <p className="text-sm text-[#95A5A6]">此題組未涵蓋任何已分類的子主題節點</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-bold text-[#2D3436]">子主題掌握度比較（雷達）</h3>
        <span className="text-xs text-[#95A5A6]">各班在兩個子主題（溶解 / 酸鹼）平均通過率</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="#E5E7EA" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#2D3436' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: '#95A5A6' }} />
            {classStats.map((c) => {
              const key = CLASS_KEY_MAP[c.id] ?? `cls_${c.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
              const color = CLASS_CHART_COLORS[c.id] || c.color || '#BDC3C7';
              return (
                <Radar
                  key={c.id}
                  name={c.name}
                  dataKey={key}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.25}
                />
              );
            })}
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-[#95A5A6] mt-2">
        子主題 A（溶解）涵蓋節點 {data[0].__matchedCount} 個 · 子主題 B（酸鹼）涵蓋節點 {data[1].__matchedCount} 個
      </p>
    </div>
  );
}
