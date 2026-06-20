/**
 * 學生報告的純資料整理 helper（與 reportCards.jsx 的 UI 元件分離，
 * 以符合 react-refresh/only-export-components：元件檔只匯出元件）。
 */
import { getAnswerOptions, getReasonOptions } from '../../data/twoTier';

/**
 * 去掉「科學上是這樣的」常見的罐頭開場「你知道嗎？」——每張卡都一樣會顯得無趣，
 * 標題已是「正確的想法／科學上是這樣的」，直接陳述事實即可。
 */
export function cleanScienceHint(text) {
  if (typeof text !== 'string') return text;
  const stripped = text.replace(/^\s*你知道嗎[，,。？?！!～~]*\s*/, '').trim();
  return stripped || text;
}

/**
 * 把作答資料整理成「每一題的結果」所需的逐題物件。
 * 兩條來源統一：剛做完走 answerSource（in-memory），歷史檢視走 backendRow.questionResults。
 * 題幹/選項由 reportQuestions 反查、正確概念由 knowledgeNodes 反查；
 * quizId 非 demo（getQuizQuestions 回空）時找不到題目即略過該筆，避免空白卡。
 */
export function buildQuestionResults({ answerSource, backendRow, reportQuestions, knowledgeNodes }) {
  // 由 nodeId 取知識節點（全域 /api/knowledge-nodes 載入），組成一張逐題卡所需的物件。
  const toItem = ({ questionId, diagnosis, stem, pickedContent, pickedReason, quadrant, nodeId }) => {
    const node = nodeId ? knowledgeNodes.find((n) => n.id === nodeId) : null;
    // two-tier：以四象限判定「完全正確」（TT）；single（無 quadrant）沿用 diagnosis。
    const correct = quadrant ? quadrant === 'TT' : diagnosis === 'CORRECT';
    const hasMiscon = diagnosis !== 'CORRECT';
    const miscon = hasMiscon && node ? node.misconceptions.find((m) => m.id === diagnosis) : null;
    const correctHint = cleanScienceHint(node?.studentHint
      || (node?.teachingStrategy ? `${node.teachingStrategy.split('。')[0]}。` : null));
    return {
      questionId,
      correct,
      quadrant: quadrant || null,
      stem: stem || null,
      pickedContent: pickedContent || null,
      pickedReason: pickedReason || null,
      correctHint,
      miscLabel: miscon?.label || null,
      misconId: hasMiscon ? diagnosis : null,
      nodeId: nodeId || null,
    };
  };

  // 剛做完那次：用前端 mock 題目資料（demo quiz-001/002）。
  if (answerSource && answerSource.length > 0) {
    return answerSource
      .map((a) => {
        const q = reportQuestions.find((qq) => qq.id === a.questionId);
        if (!q) return null;
        const picked = getAnswerOptions(q).find((o) => o.tag === a.selectedTag);
        const pickedReasonOpt = getReasonOptions(q).find((o) => o.tag === a.reasonTag);
        return toItem({
          questionId: a.questionId, diagnosis: a.diagnosis,
          stem: q.stem, pickedContent: picked?.content,
          pickedReason: pickedReasonOpt?.content, quadrant: a.quadrant,
          nodeId: q.knowledgeNodeId,
        });
      })
      .filter(Boolean)
      .sort((x, y) => x.questionId - y.questionId);
  }

  // 歷史檢視：後端 questionResults 已自帶 stem/nodeId/選項內容，**不依賴 mock**，
  // 真實教師題組（前端不認得的 quizId）也能正常渲染。沒有題幹的列略過。
  return (backendRow?.questionResults || [])
    .map((r) => toItem({
      questionId: r.questionId, diagnosis: r.diagnosis,
      stem: r.stem, pickedContent: r.selectedOptionContent,
      pickedReason: r.selectedReasonContent, quadrant: r.quadrant,
      nodeId: r.nodeId,
    }))
    .filter((it) => it.stem)
    .sort((x, y) => x.questionId - y.questionId);
}
