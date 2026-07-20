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
import { MisconceptionCard, RemedialNodeCard, QuestionResultCard } from './reportCards';
import ReportAdaptivePath from './reportAdaptivePath';
import { buildQuestionResults } from './reportData';
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
  // 請求的 quiz：in-memory 快照 > 網址參數 > 全域 currentQuizId > 預設。
  const requestedQuizId = activeStudentReport?.quizId || queryQuizId || currentQuizId || 'quiz-001';
  const needBackend = !activeStudentReport;
  const { data: history = [] } = useStudentHistory(currentUser?.id, { enabled: needBackend });
  // 找請求的 quiz；**找不到就退回該生最近一次有資料的紀錄**（history 已依時間 desc），
  // 避免 currentQuizId/網址指到該生沒做過的 quiz 時，明明有資料卻顯示「尚無作答資料」。
  const backendRow = needBackend
    ? (history.find((h) => h.quizId === requestedQuizId) || history[0] || null)
    : null;
  // 實際顯示用的 quizId 以 backendRow 為準，確保題目/標題與資料一致。
  const reportQuizId = activeStudentReport?.quizId || backendRow?.quizId || requestedQuizId;

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

  /* 成因 IDs：優先 in-memory 快照，否則 fall back backendRow.causeIdsByMisconception。 */
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

  /* errorType（spec-09 §12.4a）：優先 in-memory，否則 fall back backendRow.errorTypeByMisconception。 */
  const getErrorType = (misconceptionId) => {
    const hit = followUpResults.find((r) => r.diagnosis?.misconceptionCode === misconceptionId);
    return hit?.diagnosis?.errorType
      ?? backendRow?.errorTypeByMisconception?.[misconceptionId]
      ?? null;
  };

  /* aiSummary / statusChange：優先 in-memory，否則 fall back backendRow 的同名 *ByMisconception。 */
  const getAiSummary = (misconceptionId) =>
    followUpResults.find((r) => r.diagnosis?.misconceptionCode === misconceptionId)?.diagnosis?.aiSummary
    ?? backendRow?.aiSummaryByMisconception?.[misconceptionId]
    ?? null;
  const getStatusChange = (misconceptionId) =>
    followUpResults.find((r) => r.diagnosis?.misconceptionCode === misconceptionId)?.diagnosis?.statusChange
    ?? backendRow?.statusChangeByMisconception?.[misconceptionId]
    ?? null;
  /* reasoningQuality（低信心委婉呈現用）：優先 in-memory，否則 fall back backendRow；
     歷史無此對應時回 null → 卡片視為一般信心、不軟化。 */
  const getReasoningQuality = (misconceptionId) =>
    followUpResults.find((r) => r.diagnosis?.misconceptionCode === misconceptionId)?.diagnosis?.reasoningQuality
    ?? backendRow?.reasoningQualityByMisconception?.[misconceptionId]
    ?? null;
  /* 引用：in-memory 走 getStudentQuote，否則 fall back backendRow.quoteByMisconception。 */
  const getQuote = (misconceptionId, questionId) =>
    (questionId ? getStudentQuote(questionId) : null)
    ?? backendRow?.quoteByMisconception?.[misconceptionId]
    ?? null;

  /* 最具診斷性引用：優先 misconceptionSource，否則濾掉模糊/空話取最長一句，挑不到回 null。 */
  const FUZZY_QUOTE_WORDS = ['不知道', '我不會', '忘記', '猜的', '沒想法', '不確定', '亂選', '隨便',
    '不一定', '看情況', '都可以', '還好', '沒差'];
  const getStudentQuote = (questionId) => {
    const result = followUpResults.find((r) => r.questionId === questionId);
    const source = result?.diagnosis?.misconceptionSource;
    if (typeof source === 'string' && source.trim().length >= 4) return source.trim();
    if (!result?.conversationLog) return null;
    const studentMsgs = result.conversationLog.filter((m) => m.role === 'student');
    if (studentMsgs.length === 0) return null;
    const meaningful = studentMsgs.filter(
      (m) => m.content.trim().length >= 8 && !FUZZY_QUOTE_WORDS.some((w) => m.content.includes(w)),
    );
    // 寧缺勿濫：挑不到能反映想法的句子就不顯示引用，不秀空話
    if (meaningful.length === 0) return null;
    return meaningful.reduce((a, b) => (b.content.length > a.content.length ? b : a)).content;
  };

  // 「每一題的結果」逐題資料（in-memory 走 answerSource；歷史走 backendRow.questionResults）
  const questionResults = buildQuestionResults({
    answerSource,
    backendRow,
    reportQuestions,
    knowledgeNodes,
  });

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

  // 補救路徑由「實際答錯的節點 + 其前置節點」推導（取代過去寫死的三個 ID，
  // 那會讓所有學生看到同一份與自己答錯無關的建議）。
  const wrongNodeObjs = uniqueWrongNodes
    .map((id) => knowledgeNodes.find((n) => n.id === id))
    .filter(Boolean);

  // 答錯節點的前置概念中，「學生自己沒答錯、需先回頭打底」的那些。
  const prereqIds = [
    ...new Set(wrongNodeObjs.flatMap((n) => n.prerequisites || [])),
  ].filter((id) => !uniqueWrongNodes.includes(id));

  const needsPrereqReview = prereqIds.length > 0;

  const prereqNodeNames = prereqIds
    .map((id) => knowledgeNodes.find((n) => n.id === id)?.name)
    .filter(Boolean);

  // 先列前置（打底），再列答錯本身的節點；去重後對應到節點物件。
  const remedialNodeIds = [...new Set([...prereqIds, ...uniqueWrongNodes])];

  const remedialNodes = remedialNodeIds
    .map((id) => knowledgeNodes.find((n) => n.id === id))
    .filter(Boolean);

  const handleRetry = () => {
    navigate(`/student/quiz/${reportQuizId}`);
  };

  /* 誤判補救：學生覺得某題判斷不是他的想法 → 只重新問那一題（作答頁單題模式），
     聊完把該題新結果併回報告。導頁帶 ?retry=questionId。 */
  const handleDispute = (questionId) => {
    navigate(`/student/quiz/${reportQuizId}?retry=${questionId}`);
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

          <div className="relative max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-10 space-y-5">

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
              <div className="text-xs sm:text-sm text-[#7A5232] font-bold">
                答對題數
                <span className="block text-[10px] sm:text-xs font-normal text-[#A38A5A]">（已掌握的概念）</span>
              </div>
            </div>
            <div className="text-center border-l-2 border-dashed border-[#E0CFA8]">
              <div className="font-game text-3xl sm:text-4xl font-black text-[#D08B2E] mb-1
                              drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">{displayWrong}</div>
              <div className="text-xs sm:text-sm text-[#7A5232] font-bold">
                答錯題數
                <span className="block text-[10px] sm:text-xs font-normal text-[#A38A5A]">迷思概念（錯誤的概念）</span>
              </div>
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
        {/* 本次診斷的追蹤路徑：施測中動態選題（答錯退回先備）的實際路徑，只在有退回時顯示 */}
        <ReportAdaptivePath quizId={reportQuizId} resultItems={questionResults} />

        {/* 每一題的結果：題目與迷思合為一張卡——答對＝簡卡；答錯＝該題下方直接接完整迷思診斷 */}
        <div>
          <h2 className="font-game text-lg font-black text-[#5A3E22] mb-3 flex items-center gap-2 pl-2 border-l-[5px] border-[#D08B2E] rounded-l">
            <Icon name="fact_check" filled className="text-2xl text-[#D08B2E]" />
            每一題的結果
          </h2>

          {questionResults.length > 0 ? (
            <>
              {questionResults.every((it) => it.correct) && (
                <div className="bg-white border-[3px] border-[#5C8A2E] rounded-[24px] p-5 text-center mb-4
                                shadow-[0_4px_0_-1px_#3D5A3E,0_6px_10px_-3px_rgba(60,90,46,0.3)]">
                  <Icon name="celebration" filled className="text-4xl text-[#7DB044]" />
                  <p className="font-game font-black text-lg text-[#3D5A3E] mt-1">你答對了所有題目！</p>
                </div>
              )}
              <div className="space-y-4">
                {questionResults.map((it) => {
                  if (it.correct) return <QuestionResultCard key={it.questionId} {...it} />;
                  const node = knowledgeNodes.find((n) => n.id === it.nodeId);
                  const miscon = node?.misconceptions.find((m) => m.id === it.misconId);
                  if (!node || !miscon) return <QuestionResultCard key={it.questionId} {...it} />;
                  return (
                    <MisconceptionCard
                      key={it.questionId}
                      node={node}
                      miscon={miscon}
                      relatedQs={[]}
                      questionContext={{ questionId: it.questionId, stem: it.stem, pickedContent: it.pickedContent }}
                      quote={getQuote(miscon.id, it.questionId)}
                      causeIds={getCauseIds(miscon.id)}
                      errorType={getErrorType(miscon.id)}
                      aiSummary={getAiSummary(miscon.id)}
                      statusChange={getStatusChange(miscon.id)}
                      reasoningQuality={getReasoningQuality(miscon.id)}
                      onDispute={handleDispute}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-white border-[3px] border-[#C19A6B] rounded-[24px] p-6 text-center
                            shadow-[0_4px_0_-1px_#8B6B43,0_6px_10px_-3px_rgba(91,66,38,0.2)]">
              <Icon name="hourglass_empty" filled className="text-5xl text-[#C19A6B]" />
              <p className="font-game font-black text-base text-[#7A5232] mt-2">尚無作答資料</p>
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
                你在較後段的概念有些疑惑，建議先回頭複習基礎的
                {prereqNodeNames.length > 0
                  ? `「${prereqNodeNames.join('」、「')}」`
                  : '前置'}
                概念，打穩基礎後再往後學習會更有效喔！
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
