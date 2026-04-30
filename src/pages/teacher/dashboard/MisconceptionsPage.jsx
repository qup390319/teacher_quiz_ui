import { useOutletContext } from 'react-router-dom';
import TopMisconceptionsChart from './shared/TopMisconceptionsChart';
import ClassMisconceptionHeatmap from './shared/ClassMisconceptionHeatmap';

export default function MisconceptionsPage() {
  const { overviewData } = useOutletContext();

  if (!overviewData || overviewData.classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <p className="text-[#636E72] font-medium mb-1">此考卷尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此考卷派發給班級</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <TopMisconceptionsChart overviewData={overviewData} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <ClassMisconceptionHeatmap overviewData={overviewData} />
      </div>
    </div>
  );
}
