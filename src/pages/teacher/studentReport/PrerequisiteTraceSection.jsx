import { useMemo } from 'react';
import { buildPrerequisiteTraces, MASTERY_THRESHOLD, TRACE_STATUS } from '../../../utils/prerequisiteTrace';

/**
 * 先備概念追溯區塊（教師端學生個別診斷報告）。
 * 對每個做錯的節點畫出先備鏈：root 先備 → … → 做錯節點，
 * 每節標示精熟狀態，並在卡底給出「最早問題點」結論。
 * 依據該生**所有題組**的作答紀錄計算（不受頁面題組篩選影響）。
 */
export default function PrerequisiteTraceSection({ logs }) {
  const traces = useMemo(() => buildPrerequisiteTraces(logs), [logs]);

  if (traces.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-[#2D3436] mb-1 flex items-center gap-2">
        <span className="w-6 h-6 bg-[#BADDF4] border border-[#A3CCE9] text-[#2E86C1] rounded-full flex items-center justify-center">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>route</span>
        </span>
        先備概念追溯（{traces.length} 條）
      </h2>
      <p className="text-sm text-[#95A5A6] mb-3">
        沿知識節點的先備關係往回檢查，定位做錯的源頭。依據該生所有題組的作答紀錄計算，精熟門檻 {MASTERY_THRESHOLD}%。
      </p>
      <div className="space-y-3">
        {traces.map((trace) => (
          <TraceCard key={trace.target.id} trace={trace} />
        ))}
      </div>
    </div>
  );
}

const STATUS_META = {
  [TRACE_STATUS.MASTERED]: {
    label: '已精熟',
    icon: 'check_circle',
    pill: 'bg-[#C8EAAE] border-[#A7D696] text-[#2F4A1A]',
  },
  [TRACE_STATUS.WEAK]: {
    label: '未精熟',
    icon: 'cancel',
    pill: 'bg-[#FAC8CC] border-[#F5B8BA] text-[#E74C5E]',
  },
  [TRACE_STATUS.UNTESTED]: {
    label: '未施測',
    icon: 'help',
    pill: 'bg-[#FCF0C2] border-[#F5D669] text-[#7A5232]',
  },
};

function ChainPill({ link, isTarget }) {
  const meta = STATUS_META[link.status];
  return (
    <div
      className={`inline-flex flex-col items-start px-3 py-2 rounded-xl border ${meta.pill} ${
        isTarget ? 'ring-2 ring-[#E74C5E] ring-offset-1' : ''
      }`}
      title={link.status === TRACE_STATUS.UNTESTED
        ? '這個節點還沒有任何作答紀錄'
        : `答對率 ${link.pct}%（${link.total} 題）`}
    >
      <span className="text-[11px] font-mono opacity-70 leading-none mb-1">{link.node.id}</span>
      <span className="text-sm font-semibold leading-tight">{link.node.name}</span>
      <span className="flex items-center gap-1 text-xs font-bold mt-1">
        <span className="material-symbols-rounded" style={{ fontSize: 14 }}>{meta.icon}</span>
        {isTarget ? '本次做錯' : meta.label}
        {link.status !== TRACE_STATUS.UNTESTED && `・${link.pct}%`}
      </span>
    </div>
  );
}

function TraceConclusion({ trace }) {
  const { target, rootCause, hasPrerequisites } = trace;

  if (!hasPrerequisites) {
    return (
      <div className="flex items-start gap-2 bg-[#F9FBF7] border border-[#D5D8DC] rounded-xl p-3">
        <span className="material-symbols-rounded text-[#636E72] shrink-0" style={{ fontSize: 18 }}>info</span>
        <p className="text-sm text-[#636E72] leading-relaxed">
          「{target.name}」是學習起點節點，沒有先備概念——這是此節點自身的迷思，可直接針對本節點補救。
        </p>
      </div>
    );
  }

  if (!rootCause) {
    return (
      <div className="flex items-start gap-2 bg-[#EEF5E6] border border-[#A7D696] rounded-xl p-3">
        <span className="material-symbols-rounded text-[#3D5A3E] shrink-0" style={{ fontSize: 18 }}>task_alt</span>
        <p className="text-sm text-[#3D5A3E] leading-relaxed">
          <span className="font-bold">追溯結果：</span>
          所有先備概念皆已精熟，問題不在基礎——這是「{target.name}」本身的概念迷思，可直接針對此節點補救。
        </p>
      </div>
    );
  }

  const isUntested = rootCause.status === TRACE_STATUS.UNTESTED;
  return (
    <div className={`flex items-start gap-2 rounded-xl p-3 border ${
      isUntested ? 'bg-[#FFFBF0] border-[#F5D669]' : 'bg-[#FFF5F6] border-[#F5B8BA]'
    }`}>
      <span
        className={`material-symbols-rounded shrink-0 ${isUntested ? 'text-[#B7950B]' : 'text-[#E74C5E]'}`}
        style={{ fontSize: 18 }}
      >
        {isUntested ? 'quiz' : 'my_location'}
      </span>
      <p className={`text-sm leading-relaxed ${isUntested ? 'text-[#7A5232]' : 'text-[#2D3436]'}`}>
        <span className="font-bold">追溯結果：</span>
        {isUntested ? (
          <>
            先備概念「{rootCause.node.name}」（{rootCause.node.id}）<span className="font-bold">尚未施測</span>，
            無法確認基礎是否穩固。建議先派發涵蓋此節點的診斷題組，確認先備狀態後再補救「{target.name}」。
          </>
        ) : (
          <>
            問題最早出現在先備概念「{rootCause.node.name}」（{rootCause.node.id}），
            答對率 <span className="font-bold text-[#E74C5E]">{rootCause.pct}%</span> 未達精熟門檻。
            「{target.name}」的錯誤可能源自這裡——建議先補救此先備概念，再回頭處理本節點。
          </>
        )}
      </p>
    </div>
  );
}

function TraceCard({ trace }) {
  return (
    <div className="bg-white rounded-2xl border border-[#BDC3C7] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* 追溯鏈：root 先備 → … → 做錯節點 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {trace.chain.map((link, idx) => (
          <div key={link.node.id} className="flex items-center gap-1.5">
            {idx > 0 && (
              <span className="material-symbols-rounded text-[#95A5A6]" style={{ fontSize: 20 }}>
                arrow_forward
              </span>
            )}
            <ChainPill link={link} isTarget={idx === trace.chain.length - 1} />
          </div>
        ))}
      </div>
      <TraceConclusion trace={trace} />
    </div>
  );
}
