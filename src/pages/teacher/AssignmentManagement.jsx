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
  const [tab, setTab] = useState(initialTab); // 'diagnosis' | 'scenario'（spec-08）

  const isScenarioTab = tab === 'scenario';

  /* 兩種考卷的 published 列表 */
  const publishedQuizzes = isScenarioTab
    ? scenarioQuizzes.filter((q) => q.status === 'published')
    : quizzes.filter((q) => q.status === 'published');

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
  const handleConfirmDiagnosis = async (quizId, classId, dueDate) => {
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

  // 情境分頁：以個別學生為單位派發
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
            點擊空格即可將考卷派發給班級，點擊已派格子可管理派發狀態或查看診斷報告
          </p>
        </div>

        {/* Tab 切換：診斷／情境（spec-08）*/}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-1.5 bg-white border border-[#BDC3C7] rounded-2xl p-1.5
                        shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-fit max-w-full">
          <button
            type="button"
            onClick={() => { setTab('diagnosis'); setPopover(null); setManagePopover(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition
                       ${tab === 'diagnosis'
                         ? 'bg-[#FFF1D8] border border-[#F0B962] text-[#7A4A18]'
                         : 'text-[#636E72] hover:bg-[#EEF5E6]'}`}
          >
            📝 診斷考卷
          </button>
          <button
            type="button"
            onClick={() => { setTab('scenario'); setPopover(null); setManagePopover(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition
                       ${tab === 'scenario'
                         ? 'bg-[#E0F0E8] border border-[#3F8B5E] text-[#2E6B47]'
                         : 'text-[#636E72] hover:bg-[#EEF5E6]'}`}
          >
            🌱 情境考卷
          </button>
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
              目前沒有已發佈的{isScenarioTab ? '情境考卷' : '考卷'}
            </p>
            <p className="text-sm text-[#95A5A6] mb-5">請先建立考卷，再回來進行派發</p>
            <button
              onClick={() => navigate(isScenarioTab ? '/teacher/scenarios' : '/teacher/quizzes')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8FC87A] text-[#2D3436] border border-[#BDC3C7] rounded-2xl text-sm font-semibold hover:bg-[#76B563] transition-colors"
            >
              前往{isScenarioTab ? '情境出題' : '出題管理'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <>
          {/* 手機版：每張考卷一張卡片，班級狀態垂直堆疊（不需橫向卷軸） */}
          <div className="md:hidden space-y-4">
            {matrix.map(({ quiz, cells }) => (
              <div key={quiz.id} className="bg-white rounded-2xl border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
                {/* 考卷標頭 */}
                <div className="px-4 py-3 bg-[#EEF5E6] border-b border-[#D5D8DC]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border
                                 ${isScenarioTab
                                   ? 'bg-[#E0F0E8] text-[#2E6B47] border-[#3F8B5E]'
                                   : 'bg-[#C8EAAE] text-[#3D5A3E] border-[#BDC3C7]'}`}
                    >
                      {isScenarioTab ? '🌱 情境' : '已發佈'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#2D3436] leading-snug">{quiz.title}</p>
                  <p className="text-xs text-[#95A5A6] mt-0.5">
                    {isScenarioTab
                      ? `${quiz.questions?.length ?? 0} 題情境 · 目標節點 ${quiz.targetNodeId}`
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
                        <span className="text-xs text-[#95A5A6]">· {cls.studentCount} 人</span>
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
                              onConfirm={(dueDate) => handleConfirmDiagnosis(quiz.id, cls.id, dueDate)}
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

          {/* 桌機版（≥ md）：考卷 × 班級 矩陣表格 */}
          <div className="hidden md:block bg-white rounded-[32px] border border-[#BDC3C7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
            <div
              className="grid border-b border-[#D5D8DC] bg-[#EEF5E6]"
              style={{ gridTemplateColumns: `220px repeat(${classes.length}, minmax(140px, 1fr))` }}
            >
              <div className="px-4 sm:px-5 py-3 flex items-center">
                <span className="text-xs font-bold text-[#636E72] uppercase tracking-wide">考卷</span>
              </div>
              {classes.map((cls) => (
                <div key={cls.id} className="px-3 py-3 text-center border-l border-[#D5D8DC]">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <span className="text-sm font-semibold text-[#2D3436]">{cls.name}</span>
                  </div>
                  <p className="text-xs text-[#95A5A6] mt-0.5">{cls.studentCount} 人</p>
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
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border
                                 ${isScenarioTab
                                   ? 'bg-[#E0F0E8] text-[#2E6B47] border-[#3F8B5E]'
                                   : 'bg-[#C8EAAE] text-[#3D5A3E] border-[#BDC3C7]'}`}
                    >
                      {isScenarioTab ? '🌱 情境' : '已發佈'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#2D3436] leading-snug mb-1">{quiz.title}</p>
                  <p className="text-xs text-[#95A5A6]">
                    {isScenarioTab
                      ? `${quiz.questions?.length ?? 0} 題情境 · 目標節點 ${quiz.targetNodeId}`
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
                            onConfirm={(dueDate) => handleConfirmDiagnosis(quiz.id, cls.id, dueDate)}
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

          {/* 圖例（手機 / 桌機共用） */}
          <div className="mt-4 px-4 py-3 bg-white border border-[#BDC3C7] rounded-2xl flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
          </>
        )}
      </div>

      {/* 情境分頁：學生對象選擇器 Modal */}
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
