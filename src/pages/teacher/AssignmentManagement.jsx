import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import AssignTargetPicker from '../../components/teacher/AssignTargetPicker';
import {
  AssignPopover,
  CellActive,
  CellEmpty,
  ManagePopover,
} from './AssignmentMatrixParts';
import { useApp } from '../../context/AppContext';
import { useClasses } from '../../hooks/useClasses';
import { useQuizzes } from '../../hooks/useQuizzes';
import { useScenarios } from '../../hooks/useScenarios';
import {
  useAddAssignment,
  useAssignments,
  useRemoveAssignment,
  useUpdateAssignment,
} from '../../hooks/useAssignments';

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function AssignmentManagement({ initialTab = 'diagnosis' } = {}) {
  const navigate = useNavigate();
  const { setCurrentClassId, setCurrentQuizId } = useApp();
  const { data: assignments = [] } = useAssignments();
  const { data: quizzes = [] } = useQuizzes();
  const { data: scenarioQuizzes = [] } = useScenarios();
  const { data: classes = [] } = useClasses();
  const addAssignmentMut = useAddAssignment();
  const updateAssignmentMut = useUpdateAssignment();
  const removeAssignmentMut = useRemoveAssignment();

  const [popover, setPopover] = useState(null);
  const [managePopover, setManagePopover] = useState(null);
  // scenario tab：使用 modal-style 學生選擇器；存放 { quiz, cls, existing? }
  const [picker, setPicker] = useState(null);
  const [sortBy, setSortBy] = useState('default');

  // 題型由路由決定（從 sidebar 「派發診斷題組」或「派發釐清題組」分別進入），畫面內不再做 tab 切換
  const tab = initialTab; // 'diagnosis' | 'scenario'
  const isScenarioTab = tab === 'scenario';

  /* 兩種題組的 published 列表 */
  const publishedQuizzesRaw = isScenarioTab
    ? scenarioQuizzes.filter((q) => q.status === 'published')
    : quizzes.filter((q) => q.status === 'published');

  /* 排序：依使用者選擇對題組（矩陣 row）排序 */
  const assignCountByQuiz = (q) => assignments.filter((a) => {
    if (isScenarioTab) return a.type === 'scenario' && a.scenarioQuizId === q.id;
    return (a.type ?? 'diagnosis') === 'diagnosis' && a.quizId === q.id;
  }).length;

  const publishedQuizzes = [...publishedQuizzesRaw].sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':      return (a.title ?? '').localeCompare(b.title ?? '', 'zh-Hant');
      case 'title-desc':     return (b.title ?? '').localeCompare(a.title ?? '', 'zh-Hant');
      case 'assigned-desc':  return assignCountByQuiz(b) - assignCountByQuiz(a);
      case 'assigned-asc':   return assignCountByQuiz(a) - assignCountByQuiz(b);
      case 'newest':         return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      case 'oldest':         return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
      default:               return 0; // 預設不變動原順序
    }
  });

  /* 矩陣：對 scenario tab 用 scenarioQuizId 對應，對 diagnosis tab 用 quizId */
  const matrix = publishedQuizzes.map((quiz) => ({
    quiz,
    cells: classes.map((cls) => ({
      cls,
      assignment: assignments.find((a) => {
        if (isScenarioTab) {
          return a.type === 'scenario' && a.scenarioQuizId === quiz.id && a.classId === cls.id;
        }
        return (a.type ?? 'diagnosis') === 'diagnosis' && a.quizId === quiz.id && a.classId === cls.id;
      }) ?? null,
    })),
  }));

  // 診斷分頁：整班派發（保留原行為）
  // eslint-disable-next-line no-unused-vars -- mode will be used when backend assignment model supports dispatch_mode
  const handleConfirmDiagnosis = async (quizId, classId, dueDate, _mode) => {
    if (!dueDate) {
      alert('請選擇截止日期');
      return;
    }
    try {
      await addAssignmentMut.mutateAsync({
        type: 'diagnosis',
        quizId,
        classId,
        targetType: 'class',
        studentIds: [],
        dueDate,
        status: 'active',
      });
      setPopover(null);
    } catch (err) {
      console.error('[AssignmentManagement] add failed', err);
      alert('派發失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  // 概念釐清分頁：以個別學生為單位派發
  const handleConfirmScenarioPicker = async ({ studentIds, dueDate }) => {
    if (!picker) return;
    const { quiz, cls, existing } = picker;
    try {
      if (existing) {
        await updateAssignmentMut.mutateAsync({
          id: existing.id,
          dueDate,
          studentIds,
        });
      } else {
        await addAssignmentMut.mutateAsync({
          type: 'scenario',
          scenarioQuizId: quiz.id,
          classId: cls.id,
          targetType: 'students',
          studentIds,
          dueDate,
          status: 'active',
        });
      }
      setPicker(null);
      setManagePopover(null);
    } catch (err) {
      console.error('[AssignmentManagement] scenario add/update failed', err);
      alert('派發失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handleViewReport = (classId, quizId) => {
    setCurrentClassId(classId);
    setCurrentQuizId(quizId);
    navigate('/teacher/dashboard');
  };

  const handleUpdateDueDate = async (assignmentId, dueDate) => {
    try {
      await updateAssignmentMut.mutateAsync({ id: assignmentId, dueDate });
    } catch (err) {
      alert('更新失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  const handleRemove = async (assignmentId) => {
    try {
      await removeAssignmentMut.mutateAsync(assignmentId);
      setManagePopover(null);
    } catch (err) {
      alert('刪除失敗：' + (err?.message ?? '未知錯誤'));
    }
  };

  return (
    <TeacherLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D3436]">派題管理</h1>
          <p className="text-[#636E72] mt-1 text-sm">
            點擊空格即可將題組派發給班級，點擊已派格子可管理派發狀態或查看診斷報告
          </p>
        </div>

        {/* 排序控制（取代原本的診斷/釐清 tab 切換）*/}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-3 bg-white border border-[#BDC3C7] rounded-2xl px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-fit max-w-full">
          <div className="inline-flex items-center gap-1.5">
            <span className="material-symbols-rounded text-[#5A6663]" style={{ fontSize: 18 }}>sort</span>
            <label htmlFor="assign-sort" className="text-sm font-semibold text-[#5A6663] whitespace-nowrap">排序</label>
            <select
              id="assign-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-[#C8D6C9] rounded-lg pl-2 pr-7 py-1 text-sm font-semibold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#8FC87A] cursor-pointer"
            >
              <option value="default">預設順序</option>
              <option value="newest">建立時間：新→舊</option>
              <option value="oldest">建立時間：舊→新</option>
              <option value="title-asc">題組名稱 A→Z</option>
              <option value="title-desc">題組名稱 Z→A</option>
              <option value="assigned-desc">已派班級數 多→少</option>
              <option value="assigned-asc">已派班級數 少→多</option>
            </select>
          </div>
          <span className="text-sm text-[#95A5A6] whitespace-nowrap">共 {publishedQuizzes.length} 份{isScenarioTab ? '釐清' : '診斷'}題組</span>
        </div>

        {publishedQuizzes.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-[#BDC3C7] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="w-14 h-14 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#95A5A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#636E72] font-medium mb-1">
              目前沒有已發佈的{isScenarioTab ? '概念釐清題組' : '題組'}
            </p>
            <p className="text-sm text-[#95A5A6] mb-5">請先建立題組，再回來進行派發</p>
            <button
              onClick={() => navigate(isScenarioTab ? '/teacher/scenarios' : '/teacher/quizzes')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-2xl text-sm font-semibold hover:bg-[#76B563] transition-colors"
            >
              前往{isScenarioTab ? '概念釐清出題' : '出題管理'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <>
          {/* 圖例：放在矩陣上方，方便對照 */}
          <div className="mb-4 px-4 py-3 bg-white border border-[#BDC3C7] rounded-2xl flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <span className="text-sm text-[#95A5A6] font-medium">圖例：</span>
            {[
              { color: 'border-dashed border-[#D5D8DC] bg-white', label: '未派發', textColor: 'text-[#95A5A6]' },
              { color: 'bg-[#EEF5E6] border-[#D5D8DC]', label: '待作答', textColor: 'text-[#95A5A6]' },
              { color: 'bg-[#FCF0C2] border-[#F5D669]', label: '進行中', textColor: 'text-[#B7950B]' },
              { color: 'bg-[#C8EAAE] border-[#8FC87A]', label: '已完成', textColor: 'text-[#3D5A3E]' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded border ${item.color}`} />
                <span className={`text-sm ${item.textColor}`}>{item.label}</span>
              </div>
            ))}
          </div>
          {/* 手機版：每張題組一張卡片，班級狀態垂直堆疊（不需橫向卷軸） */}
          <div className="md:hidden space-y-4">
            {matrix.map(({ quiz, cells }) => (
              <div key={quiz.id} className="bg-white rounded-2xl border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
                {/* 題組標頭 */}
                <div className="px-4 py-3 bg-[#EEF5E6] border-b border-[#D5D8DC]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded-full border
                                 ${isScenarioTab
                                   ? 'bg-[#E0F0E8] text-[#2E6B47] border-[#3F8B5E]'
                                   : 'bg-[#C8EAAE] text-[#3D5A3E] border-[#BDC3C7]'}`}
                    >
                      {isScenarioTab ? '🌱 概念釐清' : '已發佈'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#2D3436] leading-snug">{quiz.title}</p>
                  <p className="text-sm text-[#95A5A6] mt-0.5">
                    {isScenarioTab
                      ? `${quiz.questions?.length ?? 0} 題概念釐清 · 目標節點 ${quiz.targetNodeId}`
                      : `${quiz.questionCount} 題 · ${quiz.knowledgeNodeIds.length} 個節點`}
                  </p>
                </div>
                {/* 各班狀態：一班一列 */}
                <div className="divide-y divide-[#D5D8DC]">
                  {cells.map(({ cls, assignment }) => (
                    <div key={cls.id} className="p-3 relative">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                        <span className="text-sm font-semibold text-[#2D3436]">{cls.name}</span>
                        <span className="text-sm text-[#95A5A6]">· {cls.studentCount} 人</span>
                      </div>
                      {assignment === null ? (
                        <>
                          <CellEmpty onClick={() => {
                            setManagePopover(null);
                            if (isScenarioTab) {
                              setPicker({ quiz, cls, existing: null });
                              setPopover(null);
                            } else {
                              setPopover({ quizId: quiz.id, classId: cls.id });
                            }
                          }} />
                          {!isScenarioTab && popover?.quizId === quiz.id && popover?.classId === cls.id && (
                            <AssignPopover
                              quiz={quiz}
                              cls={cls}
                              onConfirm={(dueDate, mode) => handleConfirmDiagnosis(quiz.id, cls.id, dueDate, mode)}
                              onClose={() => setPopover(null)}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <CellActive
                            assignment={assignment}
                            onClick={() => { setManagePopover({ assignmentId: assignment.id, quizId: quiz.id, classId: cls.id }); setPopover(null); }}
                          />
                          {managePopover?.assignmentId === assignment.id && (
                            <ManagePopover
                              assignment={assignment}
                              quiz={quiz}
                              cls={cls}
                              isScenario={isScenarioTab}
                              onViewReport={handleViewReport}
                              onUpdateDueDate={handleUpdateDueDate}
                              onRemove={handleRemove}
                              onEditTargets={(asg) => {
                                setPicker({ quiz, cls, existing: asg });
                                setManagePopover(null);
                              }}
                              onClose={() => setManagePopover(null)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 桌機版（≥ md）：題組 × 班級 矩陣表格 */}
          <div className="hidden md:block bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
            <div
              className="grid border-b border-[#D5D8DC] bg-[#EEF5E6]"
              style={{ gridTemplateColumns: `220px repeat(${classes.length}, minmax(140px, 1fr))` }}
            >
              <div className="px-4 sm:px-5 py-3 flex items-center">
                <span className="text-sm font-bold text-[#636E72] uppercase tracking-wide">題組</span>
              </div>
              {classes.map((cls) => (
                <div key={cls.id} className="px-3 py-3 text-center border-l border-[#D5D8DC]">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <span className="text-sm font-semibold text-[#2D3436]">{cls.name}</span>
                  </div>
                  <p className="text-sm text-[#95A5A6] mt-0.5">{cls.studentCount} 人</p>
                </div>
              ))}
            </div>

            {matrix.map(({ quiz, cells }, rowIdx) => (
              <div
                key={quiz.id}
                className={`grid ${rowIdx < matrix.length - 1 ? 'border-b border-[#D5D8DC]' : ''}`}
                style={{ gridTemplateColumns: `220px repeat(${classes.length}, minmax(140px, 1fr))` }}
              >
                <div className="px-5 py-4 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded-full border
                                 ${isScenarioTab
                                   ? 'bg-[#E0F0E8] text-[#2E6B47] border-[#3F8B5E]'
                                   : 'bg-[#C8EAAE] text-[#3D5A3E] border-[#BDC3C7]'}`}
                    >
                      {isScenarioTab ? '🌱 概念釐清' : '已發佈'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#2D3436] leading-snug mb-1">{quiz.title}</p>
                  <p className="text-sm text-[#95A5A6]">
                    {isScenarioTab
                      ? `${quiz.questions?.length ?? 0} 題概念釐清 · 目標節點 ${quiz.targetNodeId}`
                      : `${quiz.questionCount} 題 · ${quiz.knowledgeNodeIds.length} 個節點`}
                  </p>
                </div>

                {cells.map(({ cls, assignment }) => (
                  <div key={cls.id} className="p-3 border-l border-[#D5D8DC] relative">
                    {assignment === null ? (
                      <>
                        <CellEmpty onClick={() => {
                          setManagePopover(null);
                          if (isScenarioTab) {
                            setPicker({ quiz, cls, existing: null });
                            setPopover(null);
                          } else {
                            setPopover({ quizId: quiz.id, classId: cls.id });
                          }
                        }} />
                        {!isScenarioTab && popover?.quizId === quiz.id && popover?.classId === cls.id && (
                          <AssignPopover
                            quiz={quiz}
                            cls={cls}
                            onConfirm={(dueDate, mode) => handleConfirmDiagnosis(quiz.id, cls.id, dueDate, mode)}
                            onClose={() => setPopover(null)}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <CellActive
                          assignment={assignment}
                          onClick={() => { setManagePopover({ assignmentId: assignment.id, quizId: quiz.id, classId: cls.id }); setPopover(null); }}
                        />
                        {managePopover?.assignmentId === assignment.id && (
                          <ManagePopover
                            assignment={assignment}
                            quiz={quiz}
                            cls={cls}
                            isScenario={isScenarioTab}
                            onViewReport={handleViewReport}
                            onUpdateDueDate={handleUpdateDueDate}
                            onRemove={handleRemove}
                            onEditTargets={(asg) => {
                              setPicker({ quiz, cls, existing: asg });
                              setManagePopover(null);
                            }}
                            onClose={() => setManagePopover(null)}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}

            </div>
          </div>

          </>
        )}
      </div>

      {/* 概念釐清分頁：學生對象選擇器 Modal */}
      {picker && (
        <AssignTargetPicker
          quiz={picker.quiz}
          cls={picker.cls}
          existing={picker.existing}
          onConfirm={handleConfirmScenarioPicker}
          onClose={() => setPicker(null)}
        />
      )}
    </TeacherLayout>
  );
}
