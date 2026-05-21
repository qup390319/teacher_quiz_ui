import { useOutletContext } from 'react-router-dom';
import MisconceptionRankingTable from './shared/MisconceptionRankingTable';
import ClassMisconceptionHeatmap from './shared/ClassMisconceptionHeatmap';
import MisconceptionCauseDonut from './shared/MisconceptionCauseDonut';
import FollowupStatusFunnel from './shared/FollowupStatusFunnel';

export default function MisconceptionsPage() {
  const { overviewData, classes, quizId, gradeStats } = useOutletContext();

  if (!overviewData || overviewData.classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <p className="text-[#636E72] font-medium mb-1">此題組尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此題組派發給班級</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* C2：完整迷思排行表（取代原 TopMisconceptionsChart） */}
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <MisconceptionRankingTable gradeStats={gradeStats} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <MisconceptionCauseDonut overviewData={overviewData} classes={classes} quizId={quizId} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <FollowupStatusFunnel overviewData={overviewData} classes={classes} quizId={quizId} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <ClassMisconceptionHeatmap overviewData={overviewData} />
      </div>
    </div>
  );
}
