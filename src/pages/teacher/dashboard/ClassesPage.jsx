import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import ClassStatusCards from './shared/ClassStatusCards';
import MasteryDistributionHistogram from './shared/MasteryDistributionHistogram';
import { getLatestQuizIdForClass } from './shared/helpers';

export default function ClassesPage() {
  const { overviewData, classes, assignments, quizId } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!overviewData || overviewData.classStats.length === 0) {
    return (
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.06)] text-center">
        <p className="text-[#636E72] font-medium mb-1">此題組尚無派題資料</p>
        <p className="text-sm text-[#95A5A6]">請先至派題管理將此題組派發給班級</p>
      </div>
    );
  }

  const handleSelectClass = (classId) => {
    const filtered = assignments.filter(a => a.quizId === quizId);
    const latestQuizId = getLatestQuizIdForClass(filtered, classId) ?? quizId;
    const next = new URLSearchParams(searchParams);
    next.set('classId', classId);
    next.set('quizId', latestQuizId);
    navigate(`/teacher/dashboard/class-detail?${next.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <ClassStatusCards overviewData={overviewData} onSelectClass={handleSelectClass} />
      </div>
      <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <MasteryDistributionHistogram overviewData={overviewData} classes={classes} quizId={quizId} />
      </div>
    </div>
  );
}
