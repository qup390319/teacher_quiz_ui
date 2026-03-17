import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import { useApp } from '../../context/AppContext';

// 格子：未派發
function CellEmpty({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[88px] flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#D5D8DC] text-[#BDC3C7] hover:border-[#8FC87A] hover:text-[#8FC87A] hover:bg-[#EEF5E6] transition-all group"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span className="text-xs font-medium">派發</span>
    </button>
  );
}

// 格子：進行中
function CellActive({ assignment, onClick }) {
  const pct = assignment.completionRate;
  const barColor = pct === 100 ? '#8FC87A' : pct >= 50 ? '#F4D03F' : '#F28B95';
  const isComplete = pct === 100;

  return (
    <button
      onClick={onClick}
      disabled={pct === 0}
      className={`w-full h-full min-h-[88px] flex flex-col items-start justify-between p-3 rounded-2xl border transition-all ${
        isComplete
          ? 'bg-[#C8EAAE] border-[#8FC87A] hover:bg-[#8FC87A]'
          : pct === 0
          ? 'bg-[#EEF5E6] border-[#D5D8DC] cursor-default'
          : 'bg-[#FCF0C2] border-[#F5D669] hover:bg-[#F8E89A]'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <span className={`text-xs font-semibold ${
          isComplete ? 'text-[#3D5A3E]' : pct === 0 ? 'text-[#95A5A6]' : 'text-[#B7950B]'
        }`}>
          {isComplete ? '已完成' : pct === 0 ? '待作答' : '進行中'}
        </span>
        {pct > 0 && (
          <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      <div className="w-full">
        <div className="flex items-end justify-between mb-1.5">
          <span className={`text-xl font-bold leading-none ${
            isComplete ? 'text-[#3D5A3E]' : pct === 0 ? 'text-[#95A5A6]' : 'text-[#B7950B]'
          }`}>
            {pct}%
          </span>
          <span className="text-xs text-[#636E72]">{assignment.submittedCount}/{assignment.totalStudents}</span>
        </div>
        <div className="w-full bg-white/60 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
    </button>
  );
}

// Popover：點擊空格子後顯示
function AssignPopover({ quiz, cls, onConfirm, onClose }) {
  const [dueDate, setDueDate] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 z-30 bg-white border border-[#BDC3C7] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-4 w-56"
    >
      <div className="mb-3">
        <p className="text-xs font-bold text-[#2D3436] leading-snug">
          派發給 <span style={{ color: cls.textColor }}>{cls.name}</span>
        </p>
        <p className="text-xs text-[#95A5A6] mt-0.5 truncate">{quiz.title}</p>
      </div>
      <div className="mb-3">
        <label className="text-xs text-[#636E72] mb-1 block">截止日期（選填）</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-[#BDC3C7] rounded-xl px-2.5 py-1.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A]"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-1.5 text-xs font-medium text-[#636E72] border border-[#BDC3C7] rounded-xl hover:bg-[#EEF5E6] transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => onConfirm(dueDate)}
          className="flex-1 py-1.5 text-xs font-semibold bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-xl hover:bg-[#76B563] transition-colors"
        >
          確認派發
        </button>
      </div>
    </div>
  );
}

export default function AssignmentManagement() {
  const navigate = useNavigate();
  const { assignments, quizzes, classes, addAssignment, setCurrentClassId } = useApp();
  const [popover, setPopover] = useState(null); // { quizId, classId } | null

  const publishedQuizzes = quizzes.filter((q) => q.status === 'published');

  const matrix = publishedQuizzes.map((quiz) => ({
    quiz,
    cells: classes.map((cls) => ({
      cls,
      assignment: assignments.find(
        (a) => a.quizId === quiz.id && a.classId === cls.id
      ) ?? null,
    })),
  }));

  const handleConfirm = (quizId, classId, dueDate) => {
    const cls = classes.find((c) => c.id === classId);
    const today = new Date().toISOString().slice(0, 10);
    addAssignment({
      quizId,
      classId,
      assignedAt: today,
      dueDate: dueDate || '',
      status: 'active',
      completionRate: 0,
      submittedCount: 0,
      totalStudents: cls?.students.length ?? 0,
    });
    setPopover(null);
  };

  const handleViewReport = (classId) => {
    setCurrentClassId(classId);
    navigate('/teacher/dashboard');
  };

  return (
    <TeacherLayout>
      <div className="p-8">
        {/* 頁首 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#2D3436]">派題管理</h1>
          <p className="text-[#636E72] mt-1 text-sm">
            點擊空格即可將考卷派發給班級，點擊已派格子可查看診斷報告
          </p>
        </div>

        {/* 空狀態：無已發佈考卷 */}
        {publishedQuizzes.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="w-14 h-14 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#636E72] font-medium mb-1">目前沒有已發佈的考卷</p>
            <p className="text-sm text-[#95A5A6] mb-5">請先建立考卷，再回來進行派發</p>
            <button
              onClick={() => navigate('/teacher/quizzes')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-2xl text-sm font-semibold hover:bg-[#76B563] transition-colors"
            >
              前往出題管理
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          /* 矩陣看板 */
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            {/* 表頭：班級欄 */}
            <div
              className="grid border-b border-[#D5D8DC] bg-[#EEF5E6] rounded-t-[32px]"
              style={{ gridTemplateColumns: `280px repeat(${classes.length}, 1fr)` }}
            >
              <div className="px-5 py-3 flex items-center">
                <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide">考卷</span>
              </div>
              {classes.map((cls) => (
                <div key={cls.id} className="px-3 py-3 text-center border-l border-[#D5D8DC]">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <span className="text-sm font-semibold text-[#2D3436]">{cls.name}</span>
                  </div>
                  <p className="text-xs text-[#95A5A6] mt-0.5">{cls.students.length} 人</p>
                </div>
              ))}
            </div>

            {/* 矩陣列 */}
            {matrix.map(({ quiz, cells }, rowIdx) => (
              <div
                key={quiz.id}
                className={`grid ${rowIdx < matrix.length - 1 ? 'border-b border-[#D5D8DC]' : ''}`}
                style={{ gridTemplateColumns: `280px repeat(${classes.length}, 1fr)` }}
              >
                {/* 考卷資訊欄 */}
                <div className="px-5 py-4 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold bg-[#C8EAAE] text-[#3D5A3E] border border-[#BDC3C7] px-2 py-0.5 rounded-full">
                      已發佈
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#2D3436] leading-snug mb-1">{quiz.title}</p>
                  <p className="text-xs text-[#95A5A6]">{quiz.questionCount} 題 · {quiz.knowledgeNodeIds.length} 個節點</p>
                </div>

                {/* 班級格子 */}
                {cells.map(({ cls, assignment }) => (
                  <div key={cls.id} className="p-3 border-l border-[#D5D8DC] relative">
                    {assignment === null ? (
                      <>
                        <CellEmpty onClick={() => setPopover({ quizId: quiz.id, classId: cls.id })} />
                        {popover?.quizId === quiz.id && popover?.classId === cls.id && (
                          <AssignPopover
                            quiz={quiz}
                            cls={cls}
                            onConfirm={(dueDate) => handleConfirm(quiz.id, cls.id, dueDate)}
                            onClose={() => setPopover(null)}
                          />
                        )}
                      </>
                    ) : (
                      <CellActive
                        assignment={assignment}
                        onClick={() => assignment.completionRate > 0 && handleViewReport(cls.id)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* 圖例說明 */}
            <div className="px-5 py-3 border-t border-[#D5D8DC] bg-[#EEF5E6] rounded-b-[32px] flex items-center gap-6">
              <span className="text-xs text-[#95A5A6] font-medium">圖例：</span>
              {[
                { color: 'border-dashed border-[#D5D8DC] bg-white', label: '未派發', textColor: 'text-[#95A5A6]' },
                { color: 'bg-[#EEF5E6] border-[#D5D8DC]', label: '待作答', textColor: 'text-[#95A5A6]' },
                { color: 'bg-[#FCF0C2] border-[#F5D669]', label: '進行中', textColor: 'text-[#B7950B]' },
                { color: 'bg-[#C8EAAE] border-[#8FC87A]', label: '已完成', textColor: 'text-[#3D5A3E]' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded border ${item.color}`} />
                  <span className={`text-xs ${item.textColor}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
