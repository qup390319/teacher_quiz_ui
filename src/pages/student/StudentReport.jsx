import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useStudentMode } from '../../hooks/useStudentMode';
import { useStudentHistory } from '../../hooks/useStudents';
import { useQuiz } from '../../hooks/useQuizzes';
import { getQuizQuestions } from '../../data/quizData';
import { knowledgeNodes } from '../../data/knowledgeGraph';
import { Icon } from '../../components/ui/woodKit';
import { MisconceptionCard, RemedialNodeCard } from './reportCards';
import bgImg from '../../assets/backgrounds/bg_chiheisen_green.jpg';
import mascotImg from '../../assets/illustrations/scilens_mascot.png';

export default function StudentReport() {
  useStudentMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentQuizId, activeStudentReport } = useApp();
  const { currentUser } = useAuth();

  // P4: canonical 來源是 DB（/api/students/{id}/history），但「剛剛完成的測驗」
  // 走 in-memory 暫存路徑（activeStudentReport），避免 race condition + 不必要
  // 的 server 來回。重新登入後沒有 in-memory 快照時 fall back 撈 DB 摘要。
  const queryQuizId = searchParams.get('quizId');
  const reportQuizId = activeStudentReport?.quizId || queryQuizId || currentQuizId || 'quiz-001';
  const needBackend = !activeStudentReport;
  const { data: history = [] } = useStudentHistory(currentUser?.id, { enabled: needBackend });
  const backendRow = needBackend ? history.find((h) => h.quizId === reportQuizId) : null;

  const reportQuestions = getQuizQuestions(reportQuizId);
  // 題組名稱：優先 in-memory 快照；其次 DB；最後現抓 quiz 詳情
  const { data: quizDetail } = useQuiz(reportQuizId);
  const reportQuizTitle =
    activeStudentReport?.quizTitle || backendRow?.quizTitle || quizDetail?.title || '科學診斷';
  const answerSource = activeStudentReport?.answers || [];
  const misconceptionSource =
    activeStudentReport?.misconceptions || backendRow?.misconceptions || [];
  const followUpResults = activeStudentReport?.followUpResults || [];
  const hasFullAnswers = answerSource.length > 0;            // in-memory detailed
  const hasAnswers = hasFullAnswers || !!backendRow;         // any source has data
  // totalQuestions：依序取第一個 > 0 的來源（避免 mock getQuizQuestions 對真實 quiz
  // 回傳空陣列時 length=0 讓總題數變 0、進而算出負的「待更新」數）。
  const totalQuestions =
    [
      activeStudentReport?.totalQuestions,
      backendRow?.totalQuestions,
      answerSource.length,
      quizDetail?.questions?.length,
      reportQuestions.length,
    ].find((n) => typeof n === 'number' && n > 0) ?? 5;
  const displayCorrect = activeStudentReport?.correctCount ?? backendRow?.correctCount ?? (hasAnswers ? 0 : 2);
  const displayWrong = Math.max(0, totalQuestions - displayCorrect); // 永不為負

  /* 答對但 reasoningQuality 為 WEAK / GUESSING 的題目（spec §3.7 黃色標記） */
  const weakCorrectResults = followUpResults.filter((r) =>
    r.diagnosis?.finalStatus === 'CORRECT'
    && (r.diagnosis?.reasoningQuality === 'WEAK' || r.diagnosis?.reasoningQuality === 'GUESSING')
  );

  /* 取得迷思成因 IDs（來自 LLM 分析）
   * 優先讀 in-memory 快照；沒有的話 fall back 用後端 history 聚合好的
   * causeIdsByMisconception（重新登入後仍能還原成因徽章）。 */
  const getCauseIds = (misconceptionId) => {
    const causeSet = new Set();
    followUpResults.forEach((r) => {
      if (r.diagnosis?.misconceptionCode === misconceptionId && r.diagnosis?.causeIds) {
        r.diagnosis.causeIds.forEach((id) => causeSet.add(id));
      }
    });
    if (causeSet.size === 0) {
      const fallback = backendRow?.causeIdsByMisconception?.[misconceptionId];
      if (Array.isArray(fallback)) fallback.forEach((id) => causeSet.add(id));
    }
    return [...causeSet].sort((a, b) => a - b);
  };

  /* 取得該迷思的 errorType（spec-09 §12.4a）
   * 優先讀 in-memory 快照；沒有時 fall back 後端 history 聚合的
   * errorTypeByMisconception（重新登入/重整/切換分頁後仍能還原分類標籤）。 */
  const getErrorType = (misconceptionId) => {
    const hit = followUpResults.find((r) => r.diagnosis?.misconceptionCode === misconceptionId);
    return hit?.diagnosis?.errorType
      ?? backendRow?.errorTypeByMisconception?.[misconceptionId]
      ?? null;
  };

  /* 取得單一迷思相關的學生對話引用 */
  const getStudentQuote = (questionId) => {
    const result = followUpResults.find((r) => r.questionId === questionId);
    if (!result?.conversationLog) return null;
    const studentMsgs = result.conversationLog.filter((m) => m.role === 'student');
    if (studentMsgs.length === 0) return null;
    return studentMsgs[0].content; // 第一則學生回覆，最能代表初始想法
  };

  const misconDetails = (hasAnswers ? misconceptionSource : ['M02-2', 'M03-1', 'M09-1'])
    .map((mId) => {
      const node = knowledgeNodes.find((n) => n.misconceptions.find((m) => m.id === mId));
      const miscon = node?.misconceptions.find((m) => m.id === mId);
      if (!node || !miscon) return null;
      // 有完整作答快照（剛做完那次）→ 對到該題；只有 DB 摘要 → 列出該迷思可能對應的題目。
      const relatedQs = hasFullAnswers
        ? answerSource
            .filter((a) => a.diagnosis === mId)
            .map((a) => reportQuestions.find((q) => q.id === a.questionId))
            .filter(Boolean)
        : reportQuestions.filter((q) => q.options.find((o) => o.diagnosis === mId));
      return { node, miscon, relatedQs };
    })
    .filter(Boolean);

  // 從迷思清單反查涉及的知識節點（in-memory 快照可從 answerSource 直接拿，
  // DB 摘要則靠迷思 → 節點對應）。
  const wrongNodeIds = (hasFullAnswers
    ? answerSource.filter((a) => a.diagnosis !== 'CORRECT').map((a) => reportQuestions.find((q) => q.id === a.questionId)?.knowledgeNodeId)
    : hasAnswers
      ? misconceptionSource
          .map((mId) => knowledgeNodes.find((n) => n.misconceptions.find((m) => m.id === mId))?.id)
          .filter(Boolean)
      : ['INe-Ⅱ-3-02', 'INe-Ⅲ-5-4']
  ).filter(Boolean);

  const uniqueWrongNodes = [...new Set(wrongNodeIds)];

  const wrongNodesWithPrereqs = uniqueWrongNodes
    .map((id) => knowledgeNodes.find((n) => n.id === id))
    .filter((n) => n && n.prerequisites.length > 0);

  const needsPrereqReview = wrongNodesWithPrereqs.length > 0;

  const remedialNodeIds = needsPrereqReview
    ? ['INe-Ⅱ-3-01', 'INe-Ⅱ-3-02', 'INe-Ⅲ-5-1']
    : uniqueWrongNodes;

  const remedialNodes = remedialNodeIds
    .map((id) => knowledgeNodes.find((n) => n.id === id))
    .filter(Boolean);

  const handleRetry = () => {
    navigate(`/student/quiz/${reportQuizId}`);
  };

  const [step, setStep] = useState(1); // 1 = 我的科學小迷思, 2 = 下一步的指引

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* HUD：返回 + 吉祥物 + 標題列 */}
      <header className="relative z-10 flex items-center gap-3 px-3 sm:px-5 pt-4 sm:pt-5 pb-4 sm:pb-5 animate-fade-up">
        <button
          type="button"
          onClick={() => navigate('/student')}
          aria-label="返回"
          className="group inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full flex-shrink-0
                     bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                     border-[3px] border-[#8B5E3C]
                     shadow-[0_3px_0_-1px_#5A3E22,0_5px_8px_-2px_rgba(0,0,0,0.3)]
                     hover:translate-y-0.5 hover:shadow-[0_1px_0_-1px_#5A3E22]
                     transition-all duration-150"
        >
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#8B5E3C] text-white
                           flex items-center justify-center
                           group-hover:-translate-x-0.5 transition-transform">
            <Icon name="arrow_back" filled className="text-lg" />
          </span>
          <span className="font-game text-sm sm:text-base font-black text-[#5A3E22]">返回</span>
        </button>

        <div className="absolute inset-x-0 flex items-center justify-center gap-3 pointer-events-none">
          <img
            src={mascotImg}
            alt="吉祥物"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain animate-breath
                       drop-shadow-[0_3px_3px_rgba(91,66,38,0.3)] flex-shrink-0"
          />
          <div className="leading-tight min-w-0 text-center">
            <p className="font-game text-base sm:text-lg font-black text-[#5A3E22] drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
              你的科學概念診斷結果
            </p>
            <p className="text-xs sm:text-sm text-[#7A5232] font-bold mt-0.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
              了解自己目前的想法是進步的第一步！
            </p>
          </div>
        </div>
      </header>

      {/* 米紙 panel */}
      <main className="relative z-10 flex-1 flex flex-col animate-fade-up-delay-2">
        <div className="relative flex-1 bg-gradient-to-b from-[#FFF8E7] to-[#FBE9C7]
                        rounded-t-[32px] border-t-[3px] border-[#C19A6B]
                        shadow-[0_-4px_12px_-2px_rgba(91,66,38,0.15)]">
          <div
            className="absolute inset-0 pointer-events-none rounded-t-[32px] opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #F4D58A 0px, #F4D58A 2px, transparent 2px, transparent 16px)',
            }}
          />

          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-10 space-y-5">

        {/* 報告主標題 */}
        <div className="flex flex-col items-center gap-2 pb-3 border-b-2 border-dashed border-[#C19A6B]/50">
          <div className="flex items-center gap-2">
            <Icon name="assignment" filled className="text-2xl sm:text-3xl text-[#7A4A18]" />
            <h1 className="font-game text-xl sm:text-2xl font-black text-[#5A3E22] tracking-wide">
              診斷報告
            </h1>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border-2 border-[#C19A6B]
                          font-game text-xs font-black text-[#7A4A18]">
            <Icon name="quiz" filled className="text-sm" />
            {reportQuizTitle}
          </div>
        </div>

        {/* 統計卡（兩格白底木邊） */}
        <div className="bg-white border-[3px] border-[#8B5E3C] rounded-[24px] p-4 sm:p-5
                        shadow-[0_4px_0_-1px_#5A3E22,0_6px_10px_-3px_rgba(91,66,38,0.3)]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="font-game text-3xl sm:text-4xl font-black text-[#5C8A2E] mb-1
                              drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">{displayCorrect}</div>
              <div className="text-xs sm:text-sm text-[#7A5232] font-bold">已掌握的概念</div>
            </div>
            <div className="text-center border-l-2 border-dashed border-[#E0CFA8]">
              <div className="font-game text-3xl sm:text-4xl font-black text-[#D08B2E] mb-1
                              drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">{displayWrong}</div>
              <div className="text-xs sm:text-sm text-[#7A5232] font-bold">迷思概念</div>
            </div>
          </div>
        </div>

        {/* Step indicator：兩個 step 之間切換（木框風） */}
        <div className="flex gap-2">
          {[
            { n: 1, label: '我的科學小迷思', icon: 'psychology_alt' },
            { n: 2, label: '下一步的指引', icon: 'lightbulb' },
          ].map((s) => {
            const active = step === s.n;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setStep(s.n)}
                aria-pressed={active}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-2xl',
                  'border-[3px] font-game font-black text-xs sm:text-sm transition-all duration-150',
                  active
                    ? 'bg-gradient-to-b from-[#F4D58A] to-[#F0B962] border-[#9B5E18] text-[#5A3E22] shadow-[0_4px_0_-1px_#7A4A18,0_6px_10px_-3px_rgba(91,66,38,0.3)]'
                    : 'bg-white border-[#C19A6B] text-[#8B6B43] hover:bg-[#FFF8E7] hover:text-[#5A3E22] shadow-[0_2px_0_-1px_#C19A6B]',
                ].join(' ')}
              >
                <span className={[
                  'inline-flex w-5 h-5 rounded-full items-center justify-center text-xs font-bold border-2',
                  active ? 'bg-white border-[#9B5E18] text-[#7A4A18]' : 'bg-[#FFF4E0] border-[#C19A6B] text-[#7A4A18]',
                ].join(' ')}>{s.n}</span>
                <Icon name={s.icon} filled className="text-base sm:text-lg" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {step === 1 && (
          <>
        {/* Section 1: My Misconceptions */}
        <div>
          <h2 className="font-game text-lg font-black text-[#5A3E22] mb-3 flex items-center gap-2 pl-2 border-l-[5px] border-[#D08B2E] rounded-l">
            <Icon name="psychology_alt" filled className="text-2xl text-[#D08B2E]" />
            我的科學小迷思
          </h2>

          {misconDetails.length > 0 ? (
            <div className="space-y-4">
              {misconDetails.map(({ node, miscon, relatedQs }) => (
                <MisconceptionCard
                  key={miscon.id}
                  node={node}
                  miscon={miscon}
                  relatedQs={relatedQs}
                  quote={relatedQs.length > 0 ? getStudentQuote(relatedQs[0].id) : null}
                  causeIds={getCauseIds(miscon.id)}
                  errorType={getErrorType(miscon.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border-[3px] border-[#5C8A2E] rounded-[24px] p-6 text-center
                            shadow-[0_4px_0_-1px_#3D5A3E,0_6px_10px_-3px_rgba(60,90,46,0.3)]">
              <Icon name="celebration" filled className="text-5xl text-[#7DB044]" />
              <p className="font-game font-black text-lg text-[#3D5A3E] mt-2">你答對了所有題目！</p>
              <p className="text-sm text-[#5A8A5C] mt-1 font-bold">你對這些科學概念有很好的理解！</p>
            </div>
          )}
        </div>

        {/* Section 1.5: Correct but Weak Reasoning（答對但可深入理解） */}
        {weakCorrectResults.length > 0 && (
          <div>
            <h2 className="font-game text-base font-black text-[#5A3E22] mb-3 flex items-center gap-2 pl-2 border-l-[5px] border-[#D4AC0D] rounded-l">
              <Icon name="help" filled className="text-2xl text-[#D4AC0D]" />
              答對了，但可以更深入理解
            </h2>
            <div className="space-y-3">
              {weakCorrectResults.map((r) => {
                const q = reportQuestions.find((qq) => qq.id === r.questionId);
                const node = q ? knowledgeNodes.find((n) => n.id === q.knowledgeNodeId) : null;
                const studentMsg = r.conversationLog?.find((m) => m.role === 'student');
                return (
                  <div key={r.questionId} className="bg-gradient-to-b from-[#FFFBF0] to-[#FFF4D6] border-[3px] border-[#F5D669] rounded-[20px] p-4
                                                    shadow-[0_3px_0_-1px_#D4AC0D,0_5px_8px_-2px_rgba(212,172,13,0.3)]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-game text-xs font-black px-2.5 py-1 rounded-full bg-white border-2 border-[#F5D669] text-[#B9770E]">
                        {node?.name || '科學概念'}
                      </span>
                    </div>
                    {studentMsg && (
                      <p className="text-sm text-[#7A5232] mb-2 leading-relaxed italic">
                        你的回答：「{studentMsg.content}」
                      </p>
                    )}
                    <p className="text-sm text-[#5A3E22] leading-relaxed">
                      {r.diagnosis?.aiSummary || '建議再花點時間想想：這個現象背後的原理是什麼？'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

          </>
        )}

        {step === 2 && (
          <>
        {/* Section 2: Remedial Path */}
        <div>
          <h2 className="font-game text-lg font-black text-[#5A3E22] mb-3 flex items-center gap-2 pl-2 border-l-[5px] border-[#2E86C1] rounded-l">
            <Icon name="lightbulb" filled className="text-2xl text-[#2E86C1]" />
            下一步的指引
          </h2>

          {needsPrereqReview && (
            <div className="bg-gradient-to-b from-[#D6ECFA] to-[#BADDF4] border-[3px] border-[#5BA3CC] rounded-2xl p-4 mb-4 flex items-start gap-3
                            shadow-[0_3px_0_-1px_#3A7FA8,0_5px_8px_-2px_rgba(58,127,168,0.3)]">
              <Icon name="info" filled className="text-2xl text-[#1F6B9C] flex-shrink-0" />
              <p className="text-sm text-[#7A5232] font-bold leading-relaxed">
                你在較後段的概念有些疑惑，建議先回頭複習基礎的「溶解現象」與「水溶液組成」概念，打穩基礎後再往後學習會更有效喔！
              </p>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          bg-gradient-to-b from-[#D6ECFA] to-[#BADDF4] border-2 border-[#8AC0E0]
                          shadow-[0_2px_0_-1px_#5293B4]
                          font-game text-xs sm:text-sm font-black text-[#1F6B9C] mb-3">
            <Icon name="play_circle" filled className="text-base sm:text-lg" />
            推薦相關概念教學影片
          </div>

          <div className="space-y-3">
            {remedialNodes.map((node) => (
              <RemedialNodeCard key={node.id} node={node} />
            ))}
          </div>
        </div>

          </>
        )}

        {/* Pager / Actions：依當前 step 顯示不同按鈕組（木框風） */}
        {step === 1 ? (
          <div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="group w-full py-3.5 rounded-2xl border-[3px] border-[#9B5E18] font-game font-black text-base sm:text-lg
                         bg-gradient-to-b from-[#F4D58A] to-[#F0B962] text-[#5A3E22]
                         shadow-[0_4px_0_#9B5E18,0_6px_10px_-2px_rgba(155,94,24,0.4)]
                         hover:translate-y-0.5 hover:shadow-[0_2px_0_#9B5E18]
                         transition-all duration-150 flex items-center justify-center gap-2"
            >
              <span>下一頁：下一步的指引</span>
              <Icon name="arrow_forward" filled className="text-xl group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="group w-full py-3 rounded-2xl border-[3px] border-[#C19A6B] font-game font-black text-sm sm:text-base
                         bg-white text-[#8B6B43] hover:bg-[#FFF8E7] hover:text-[#5A3E22]
                         shadow-[0_2px_0_-1px_#C19A6B] transition-all duration-150
                         flex items-center justify-center gap-2"
            >
              <Icon name="arrow_back" filled className="text-lg group-hover:-translate-x-0.5 transition-transform" />
              <span>上一頁：我的科學小迷思</span>
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-3 rounded-2xl border-[3px] border-[#C19A6B] font-game font-black text-sm sm:text-base
                           bg-white text-[#8B6B43] hover:bg-[#FFF8E7] hover:text-[#5A3E22]
                           shadow-[0_2px_0_-1px_#C19A6B] transition-all duration-150
                           flex items-center justify-center gap-1.5"
              >
                <Icon name="refresh" filled className="text-lg" />
                重新作答
              </button>
              <button
                onClick={() => navigate('/student')}
                className="flex-1 py-3 rounded-2xl border-[3px] border-[#5C8A2E] font-game font-black text-sm sm:text-base
                           bg-gradient-to-b from-[#B8DC83] to-[#7DB044] text-[#2F4A1A]
                           shadow-[0_4px_0_#5C8A2E,0_6px_10px_-2px_rgba(92,138,46,0.4)]
                           hover:translate-y-0.5 hover:shadow-[0_2px_0_#5C8A2E]
                           transition-all duration-150 flex items-center justify-center gap-1.5"
              >
                <Icon name="home" filled className="text-lg" />
                回到首頁
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}
