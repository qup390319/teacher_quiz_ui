/* StudentQuiz 的純設定常數與排序工具（自 StudentQuiz.jsx 抽出，控制檔案行數）。 */
import { knowledgeNodes } from '../../data/knowledgeGraph';

/** 知識節點 → 學習順序索引，用於把題目依節點順序排序。 */
const nodeOrder = Object.fromEntries(knowledgeNodes.map((n, i) => [n.id, i]));

/** 學生作答前的 3 則開場訊息（科學偵探開場、預告兩階段、降低壓力）。 */
export const INTRO_MESSAGES = [
  { id: 'intro-1', text: '你好！我是「科學偵探」' },
  { id: 'intro-2', text: '今天我們要一起探索關於「水溶液」的科學思維。整個過程有兩個階段：先回答情境選擇題，然後我會跟你聊聊你的想法。' },
  { id: 'intro-3', text: '沒有對錯評分，我只是想更深入了解你的思考方式。準備好了嗎？' },
];

/** 依知識節點學習順序排序題目（未知節點排末尾）。 */
export const sortQuestionsByNodeOrder = (questions) =>
  [...questions].sort(
    (a, b) => (nodeOrder[a.knowledgeNodeId] ?? 99) - (nodeOrder[b.knowledgeNodeId] ?? 99),
  );
