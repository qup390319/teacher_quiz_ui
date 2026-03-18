import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function StudentHome() {
  const navigate = useNavigate();
  const {
    quizzes,
    studentHistory,
    setCurrentQuizId,
    setActiveStudentReport,
  } = useApp();

  const publishedQuizzes = quizzes.filter((quiz) => quiz.status === 'published');

  const handleStartQuiz = (quizId) => {
    setCurrentQuizId(quizId);
    setActiveStudentReport(null);
    navigate(`/student/quiz/${quizId}`);
  };

  const handleOpenReport = (record) => {
    setActiveStudentReport(record);
    setCurrentQuizId(record.quizId);
    navigate('/student/report');
  };

  return (
    <div className="min-h-screen bg-[#EEF5E6]">
      <div className="bg-white border-b border-[#D5D8DC] px-6 py-8 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-[#BDC3C7] bg-[#EEF5E6] text-[#2D3436] hover:bg-[#D5D8DC] transition-colors flex-shrink-0"
              aria-label="返回"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-12 h-12 bg-[#BADDF4] border border-[#BDC3C7] rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🧑</span>
            </div>
            <div>
              <p className="text-sm text-[#636E72]">嗨！</p>
              <h1 className="text-2xl font-bold text-[#2D3436]">今天想先做什麼呢？</h1>
            </div>
          </div>
          <p className="text-sm text-[#636E72] leading-relaxed">
            你可以先選一張考卷開始作答，或回頭看看之前的診斷結果。
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-[#C8EAAE] border border-[#BDC3C7] rounded-full flex items-center justify-center text-sm">1</span>
            <h2 className="text-base font-bold text-[#2D3436]">選擇要作答的考卷</h2>
          </div>

          <div className="space-y-3">
            {publishedQuizzes.map((quiz) => {
              const latestRecord = studentHistory.find((item) => item.quizId === quiz.id);

              return (
                <div
                  key={quiz.id}
                  className="bg-white border border-[#BDC3C7] rounded-[28px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-[#95A5A6] mb-1">{quiz.id}</p>
                      <h3 className="text-lg font-bold text-[#2D3436]">{quiz.title}</h3>
                      <p className="text-sm text-[#636E72] mt-1">
                        共 {quiz.questionCount} 題
                        {latestRecord ? ' · 你之前做過這份考卷' : ' · 尚未作答'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      className="px-5 py-3 rounded-2xl bg-[#8FC87A] border border-[#BDC3C7] text-sm font-semibold text-[#2D3436] hover:bg-[#76B563] transition-colors"
                    >
                      {latestRecord ? '再次作答' : '開始作答'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-[#BADDF4] border border-[#BDC3C7] rounded-full flex items-center justify-center text-sm">2</span>
            <h2 className="text-base font-bold text-[#2D3436]">觀看歷史診斷紀錄</h2>
          </div>

          {studentHistory.length > 0 ? (
            <div className="space-y-3">
              {studentHistory.map((record, index) => (
                <button
                  key={`${record.quizId}-${record.completedAt}-${index}`}
                  onClick={() => handleOpenReport(record)}
                  className="w-full text-left bg-white border border-[#BDC3C7] rounded-[28px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:bg-[#F7FBF3] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#2D3436]">{record.quizTitle}</h3>
                      <p className="text-sm text-[#636E72] mt-1">完成時間：{record.completedAt}</p>
                      <p className="text-sm text-[#636E72] mt-1">
                        掌握 {record.correctCount} 題
                        {record.misconceptions.length > 0
                          ? ` · 發現 ${record.misconceptions.length} 個需要再確認的想法`
                          : ' · 沒有發現明顯迷思'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#2E86C1]">查看結果</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#BDC3C7] rounded-[28px] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <p className="text-base font-bold text-[#2D3436]">還沒有診斷紀錄</p>
              <p className="text-sm text-[#636E72] mt-2">先完成一張考卷，就能在這裡看到你的學習體檢表。</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
