/**
 * 第二層 AI 追問引擎
 *
 * 雙模式：
 *  1. LLM 模式（預設）：呼叫 followUpLlm.runFollowUpTurnLlm，採 POE + 蘇格拉底結構，
 *     最多 4 輪（控制施測總時長），輸出含 chips / causeIds 的結構化結果。
 *  2. Rule-based 模式（fallback）：原本的 3 輪 keyword/regex 啟發式，保留作 LLM
 *     失敗或自訂迷思（無 LLM prompt）時的後援。
 *
 * 對外的 processStudentReply 改為 async；rule-based 部分另存為
 * processStudentReplyMock 供 dispatcher 內部調用。
 *
 * 規格：spec-05 §2.2、spec-09 §followup
 */
import { hasLlmFollowUpFor, runFollowUpTurnLlm, FOLLOWUP_MAX_ROUNDS } from './followUpLlm.js';

const FUZZY_KEYWORDS = ['不知道', '我不會', '忘記了', '猜的', '沒想法',
  '不確定', '亂選', '隨便選', '老師說', '上課有講', '課本上'];

const BRIEF_ELICIT = [
  '喔～那你是怎麼想到的？',
  '嗯嗯，然後呢？可以再多說一點嗎？',
  '原來如此，為什麼你會這樣覺得？',
];

const NONSENSE_RE = /^[\s哈嘻呵嘿噗ㄏ笑XDxd~～!！?？.。,，0-9\W]+$/;

const REDIRECT_BY_NODE = {
  'INe-Ⅱ-3-02': '沒關係！像是「因為我覺得糖不見了」或「因為水還是甜的」，講一兩句就好。你為什麼會選那個答案？',
  'INe-Ⅱ-3-03': '沒關係！像是「因為攪拌比較快」或「因為不攪也會溶」，講一兩句就好。你為什麼會選那個答案？',
  'INe-Ⅱ-3-05': '沒關係！像是「因為糖加太多會沉下去」或「因為水不夠」，講一兩句就好。你為什麼會選那個答案？',
  'INe-Ⅲ-5-4': '沒關係！像是「因為嚐起來酸酸的」或「因為要用試紙」，講一兩句就好。你為什麼會選那個答案？',
  'INe-Ⅲ-5-7': '沒關係！像是「因為酸會腐蝕」或「因為可以拿來清東西」，講一兩句就好。你為什麼會選那個答案？',
};
const REDIRECT_FALLBACK = '沒關係！像是「因為我覺得⋯⋯」或「因為上課有學過⋯⋯」，講一兩句就好。你為什麼會選那個答案？';

// 各知識節點的「正確概念」關鍵詞——用來判讀學生是否真的理解
const NODE_CORRECT_KEYWORDS = {
  'INe-Ⅱ-3-02': ['粒子', '分散', '看不見', '還在', '蒸發', '存在', '結晶', '變小', '小小的', '微小'],
  'INe-Ⅱ-3-03': ['速度', '變快', '加快', '上限', '總量', '一樣多', '不會更多', '飽和', '量是固定'],
  'INe-Ⅱ-3-05': ['上限', '飽和', '溶不下', '沉澱', '沉到', '極限', '最多', '超過', '溶不了'],
  'INe-Ⅲ-5-4': ['石蕊', '試紙', '變色', '紅', '藍', '指示劑', '顏色', '紫色高麗菜'],
  'INe-Ⅲ-5-7': ['中和', '酸鹼', '油脂', '清潔', '緩解', '分解', '工具', '反應', '生成'],
};

// ── Round 2 模板 ────────────────────────────────────────────────────
const R2_FUZZY = {
  'INe-Ⅱ-3-02': '沒關係。你覺得糖水放好幾天沒打開，喝起來還會甜嗎？',
  'INe-Ⅱ-3-03': '沒關係。兩杯水各加一樣的糖，一杯攪拌、一杯不動，你覺得最後能溶的糖一樣多嗎？',
  'INe-Ⅱ-3-05': '沒關係。杯底已經有糖溶不掉了，再用力攪拌，你覺得那些糖會溶進去嗎？',
  'INe-Ⅲ-5-4': '沒關係。只用聞的或嚐的，你覺得能分出哪杯是酸性、哪杯是鹼性嗎？',
  'INe-Ⅲ-5-7': '沒關係。醋是酸性、肥皂水是鹼性，你覺得它們都很危險嗎？',
};

const R2_CONTRAST_BY_MISCON = {
  'M02-1': '那把糖水加熱，水蒸發掉了，你覺得杯底會看到什麼？',
  'M02-2': '你覺得糖溶在水裡，跟冰塊融化，是一樣的嗎？',
  'M02-3': '你覺得糖水蒸發出來的水蒸氣，會是甜的嗎？',
  'M02-4': '你覺得糖溶在水裡之後，把水蒸發掉，還能看到糖嗎？',
  'M03-1': '兩杯水都溶不下糖了，一杯繼續攪拌、一杯放著，你覺得最後溶的糖一樣多嗎？',
  'M03-2': '方糖丟進熱水裡不去攪，過一段時間你覺得方糖會怎樣？',
  'M03-3': '你覺得杯底沉下去的糖，繼續攪拌就會溶回去嗎？',
  'M03-4': '你覺得攪拌跟不攪拌，糖溶解的速度會一樣嗎？',
  'M05-1': '加熱讓糖都溶完後，蓋著放一個禮拜，你覺得糖還會在水裡嗎？',
  'M05-2': '如果只是糖太重才沉到杯底，那為什麼水還是甜的呢？',
  'M05-3': '一杯水的糖已經加到沉澱了，你覺得再多加 10 公克會怎樣？',
  'M05-4': '你覺得糖溶解之後，是浮在水面上還是分散在水裡面？',
  'M09-1': '一杯水嚐起來鹹鹹的，但石蕊試紙沒變藍，你覺得它是鹼性嗎？',
  'M09-2': '純水跟糖水都沒有刺鼻味，你覺得「沒有刺鼻味」就一定是中性嗎？',
  'M09-3': '「醋」名字裡沒有「酸」字，你覺得它是不是酸性的？',
  'M09-4': '你覺得用嘴巴嚐水溶液來判斷酸鹼，安全嗎？',
  'M12-1': '平常會用醋除水垢、小蘇打緩解蜂螫，你覺得酸鹼真的都很危險嗎？',
  'M12-2': '你覺得「很濃」跟「很酸」是同一件事嗎？',
  'M12-3': '你覺得酸跟鹼中和之後，產生的東西是消失了，還是變成別的？',
  'M12-4': '檸檬酸、胺基酸都有「酸」字，你覺得它們會傷害身體嗎？',
};

const R2_DEEPEN = {
  'INe-Ⅱ-3-02': '嗯，你有注意到糖還在水裡。那你覺得它變成什麼樣子了？',
  'INe-Ⅱ-3-03': '嗯，你知道攪拌會加快溶解。那你覺得想讓更多糖溶進去，光靠攪拌做得到嗎？',
  'INe-Ⅱ-3-05': '嗯，你有提到溶不下去的情況。那你覺得不管多濃的糖水，再加糖都會沉底嗎？',
  'INe-Ⅲ-5-4': '嗯，你有提到石蕊試紙。那你覺得變紅色代表什麼呢？',
  'INe-Ⅲ-5-7': '嗯，你有提到可以用酸鹼解決問題。那你覺得怎麼判斷該用酸還是用鹼？',
};

const R2_GUESS = {
  'INe-Ⅱ-3-02': '換個例子：鹽加進熱湯裡攪一攪就看不見了，但喝起來是鹹的。你覺得鹽跑去哪了？',
  'INe-Ⅱ-3-03': '換個例子：兩杯水各加一樣的糖，一杯攪拌、一杯放著，你覺得最後能溶的糖一樣多嗎？',
  'INe-Ⅱ-3-05': '換個例子：一杯水的糖已經溶不下去了，你覺得再加更多糖會怎樣？',
  'INe-Ⅲ-5-4': '換個例子：石蕊試紙放進肥皂水裡變藍了，你覺得肥皂水是酸性、中性還是鹼性？',
  'INe-Ⅲ-5-7': '換個例子：水龍頭結了白白的水垢，你覺得要用酸性還是鹼性的東西來清？',
};

// ── Round 3 模板 ────────────────────────────────────────────────────
const R3_AB = {
  'INe-Ⅱ-3-02': '最後一題！你覺得哪個比較接近你的想法？\n（A）糖溶到水裡就消失了。\n（B）糖變成很小的粒子分散在水裡，還在的。',
  'INe-Ⅱ-3-03': '最後一題！你覺得哪個比較接近？\n（A）攪拌越久，能溶的糖越多。\n（B）攪拌只是讓糖溶更快，能溶的量是固定的。',
  'INe-Ⅱ-3-05': '最後一題！你覺得哪個比較接近？\n（A）只要一直加水或加熱，糖可以一直溶。\n（B）一杯水能溶的糖有上限，超過就會沉底。',
  'INe-Ⅲ-5-4': '最後一題！你覺得哪個比較接近？\n（A）用嚐的或聞的就能判斷酸鹼。\n（B）要用指示劑才能準確判斷。',
  'INe-Ⅲ-5-7': '最後一題！你覺得哪個比較接近？\n（A）酸鹼都很危險，不要碰比較好。\n（B）酸鹼是工具，用對方法可以幫忙。',
};

const R3_TRANSFER = {
  'INe-Ⅱ-3-02': '你覺得鹽水放在太陽下曬乾，杯底會看到什麼？',
  'INe-Ⅱ-3-03': '同樣的糖加進兩杯水，一杯攪拌、一杯靜置，你覺得半小時後能溶的糖一樣多嗎？',
  'INe-Ⅱ-3-05': '糖已經溶不下了，你覺得再加 5 公克糖會怎樣？',
  'INe-Ⅲ-5-4': '拿到一杯不知名的透明液體，你會怎麼判斷它是酸性、鹼性還是中性？',
  'INe-Ⅲ-5-7': '水管被油脂堵住了，你覺得要倒酸性還是鹼性的清潔劑？',
};

// ── 純函式：分析學生回覆 ─────────────────────────────────────────────
const isFuzzyReply = (t) => {
  const trimmed = (t || '').trim();
  if (trimmed.length < 10) return true;
  return FUZZY_KEYWORDS.some((k) => trimmed.includes(k));
};

const isNonsenseReply = (t) => {
  const trimmed = (t || '').trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length <= 6 && NONSENSE_RE.test(trimmed)) return true;
  if (trimmed.length <= 3) return true;
  return false;
};

const isBriefReply = (t) => {
  const trimmed = (t || '').trim();
  return trimmed.length >= 10 && trimmed.length <= 25;
};

const pickElicit = () => BRIEF_ELICIT[Math.floor(Math.random() * BRIEF_ELICIT.length)];
const buildRedirect = (nodeId) => REDIRECT_BY_NODE[nodeId] || REDIRECT_FALLBACK;

const mentionsCorrectConcept = (t, nodeId) => {
  const text = (t || '').trim();
  const keywords = NODE_CORRECT_KEYWORDS[nodeId] || [];
  return keywords.some((k) => text.includes(k));
};

// ── 公開 API ───────────────────────────────────────────────────────

/**
 * 建立 Round 1 的 AI 開場提問。
 * @param {{content: string}} option - 學生選的選項
 * @param {boolean} isCorrect - 第一層判定是否正確
 */
export function buildRound1Message(option, isCorrect) {
  const safe = (option?.content ?? '').replace(/\s+/g, ' ');
  // 蘇格拉底開場（belief 探索第一步）：先讓學生用自己的話說出推理，AI 不預設方向。
  // 加上「想到了什麼／講一句就好」的鷹架降低國小生開口門檻，但不洩漏答案。
  // 後續幾輪再由 LLM 進行思想實驗式探問（challenge / cause）。
  return isCorrect
    ? `你選了「${safe}」。你會這樣選，是因為想到了什麼呢？講一句你的想法就好～`
    : `你選了「${safe}」。你會這樣選，是因為想到了什麼呢？講一句就好，沒有標準答案喔～`;
}

/**
 * 處理學生回覆，產出下一步 (next 追問 / final 診斷)。
 *
 * Async dispatcher：先嘗試 LLM；若該節點無 prompt 或 LLM 失敗，fallback 到 rule-based。
 *
 * @param {object} ctx - { round, strategy, isCorrect, misconceptionId, knowledgeNodeId,
 *                         conversationLog, questionStem?, selectedOptionContent?, phase? }
 * @param {string} reply - 學生的最新回覆
 * @returns {Promise<object>} { kind: 'next' | 'final', aiMessage?, strategy?, chips?, feedback?,
 *                              phase?, round?, finalDiagnosis? }
 */
export async function processStudentReply(ctx, reply) {
  if (hasLlmFollowUpFor(ctx.knowledgeNodeId)) {
    try {
      return await runFollowUpTurnLlm(
        {
          knowledgeNodeId: ctx.knowledgeNodeId,
          misconceptionId: ctx.misconceptionId,
          isCorrect: ctx.isCorrect,
          questionStem: ctx.questionStem ?? '',
          selectedOptionContent: ctx.selectedOptionContent
            ?? ctx.selectedOption?.content ?? '',
          conversationLog: ctx.conversationLog ?? [],
          round: ctx.round ?? 1,
          phase: ctx.phase ?? 'belief',
        },
        reply,
      );
    } catch (err) {
      console.warn('[followUp] LLM turn failed, falling back to rule-based:', err?.message ?? err);
      // fall through to mock
    }
  }
  return processStudentReplyMock(ctx, reply);
}

/**
 * Rule-based fallback。同步、不依賴 LLM。
 */
export function processStudentReplyMock(ctx, reply) {
  const fuzzy = isFuzzyReply(reply);
  const nonsense = isNonsenseReply(reply);
  const brief = !fuzzy && isBriefReply(reply);
  const matchesCorrect = mentionsCorrectConcept(reply, ctx.knowledgeNodeId);

  if (nonsense && ctx.strategy !== 'redirect') {
    return { kind: 'next', strategy: 'redirect', keepRound: true, aiMessage: buildRedirect(ctx.knowledgeNodeId) };
  }

  if (ctx.round === 1 && brief && !['elicit', 'redirect'].includes(ctx.strategy)) {
    return { kind: 'next', strategy: 'elicit', keepRound: true, aiMessage: pickElicit() };
  }

  const { round } = ctx;
  if (round === 1) return handleAfterRound1(ctx, fuzzy, matchesCorrect);
  if (round === 2) return handleAfterRound2(ctx, reply, fuzzy, matchesCorrect);
  return handleAfterRound3(ctx, reply, fuzzy, matchesCorrect);
}

export { FOLLOWUP_MAX_ROUNDS };

function handleAfterRound1(ctx, fuzzy, matchesCorrect) {
  const { isCorrect, knowledgeNodeId, misconceptionId } = ctx;

  if (isCorrect && matchesCorrect && !fuzzy) {
    return {
      kind: 'next',
      strategy: 'deepen',
      aiMessage: R2_DEEPEN[knowledgeNodeId]
        || '嗯，你可以再多說一點你是怎麼想的嗎？',
    };
  }
  if (isCorrect) {
    return {
      kind: 'next',
      strategy: 'guess',
      aiMessage: R2_GUESS[knowledgeNodeId]
        || '換個例子來想，你覺得會怎樣？',
    };
  }
  if (fuzzy) {
    return {
      kind: 'next',
      strategy: 'fuzzy',
      aiMessage: R2_FUZZY[knowledgeNodeId]
        || '沒關係，我們換個例子來想⋯⋯',
    };
  }
  return {
    kind: 'next',
    strategy: 'contrast',
    aiMessage: R2_CONTRAST_BY_MISCON[misconceptionId]
      || '換個角度想想看，你覺得呢？',
  };
}

function handleAfterRound2(ctx, reply, fuzzy, matchesCorrect) {
  switch (ctx.strategy) {
    case 'deepen':
      // 情境 C：能持續完整解釋 → SOLID；否則 PARTIAL
      return finalize(ctx, matchesCorrect && !fuzzy ? 'SOLID' : 'PARTIAL');

    case 'contrast': {
      // 情境 B 第 2 輪：若學生在對比情境中切換到正確理解，標 UPGRADED 結束
      if (matchesCorrect && !fuzzy) {
        return finalize(ctx, 'PARTIAL', 'UPGRADED');
      }
      // 否則進 Round 3 探究來源
      return {
        kind: 'next',
        strategy: 'source',
        aiMessage: '你是怎麼會這樣想的？是生活經驗還是上課聽到的？',
      };
    }

    case 'fuzzy':
      return {
        kind: 'next',
        strategy: 'ab',
        aiMessage: R3_AB[ctx.knowledgeNodeId]
          || '你覺得哪個比較接近你的想法？',
      };

    case 'guess':
      if (matchesCorrect && !fuzzy) return finalize(ctx, 'PARTIAL');
      return {
        kind: 'next',
        strategy: 'transfer',
        aiMessage: R3_TRANSFER[ctx.knowledgeNodeId]
          || '再換個例子，你覺得呢？',
      };

    default:
      return finalize(ctx, 'PARTIAL');
  }
}

function handleAfterRound3(ctx, reply, fuzzy, matchesCorrect) {
  switch (ctx.strategy) {
    case 'source':
      // 學生回答迷思來源 → 確認迷思
      return finalize(ctx, 'WEAK', 'CONFIRM_MISCONCEPTION', reply);

    case 'ab': {
      // 解析二選一：(A) 持續迷思 / (B) 正確
      const trimmed = reply.trim();
      const choseB = /(^|[^A-Za-z])B(?![A-Za-z])|（B）|想法 ?B|選 ?B/i.test(trimmed);
      const choseA = /(^|[^A-Za-z])A(?![A-Za-z])|（A）|想法 ?A|選 ?A/i.test(trimmed);
      if (choseB && !choseA) return finalize(ctx, 'PARTIAL', 'UPGRADED');
      return finalize(ctx, 'WEAK', 'CONFIRM_MISCONCEPTION');
    }

    case 'transfer':
      return finalize(ctx, matchesCorrect && !fuzzy ? 'PARTIAL' : 'GUESSING');

    default:
      return finalize(ctx, 'PARTIAL');
  }
}

// ── 各節點的「答對但解釋不夠扎實」針對性提醒 ──
// CORRECT + WEAK 路徑專用：點出該節點的關鍵原理，提示學生補上缺少的解釋
const WEAK_REASONING_HINT_BY_NODE = {
  'INe-Ⅱ-3-02': '答案對，但你還沒清楚說明「糖溶解後其實還在水裡，只是粒子分散到看不見」這個原理。如果把糖水蒸發，糖會再出現喔，下次可以從這個角度想想看。',
  'INe-Ⅱ-3-03': '答案對，但你還沒分清楚「攪拌只是讓溶解變快」和「水能溶解的總量有上限」這兩件事。攪拌再用力，也不會超過水原本能溶解的上限。',
  'INe-Ⅱ-3-05': '答案對，但你還沒解釋為什麼會有「溶解上限」——溫度、物質種類都會影響能溶多少。同樣的水量，糖跟鹽能溶的最多量是不同的。',
  'INe-Ⅱ-3-04': '答案對，但你還沒清楚說明「相同濃度的水溶液，每一處的甜度／鹹度都一樣」這個概念。沉澱層比較濃，是因為超過了溶解上限，跟正常溶液不同。',
  'INe-Ⅲ-5-1': '答案對，但你還沒說出酸鹼判斷不能只靠味道或外觀，需要用指示劑等工具測試。下次可以多想想「為什麼老師強調不能用嚐的」。',
  'INe-Ⅲ-5-2': '答案對，但你還沒解釋為什麼日常的水溶液有些是酸、有些是鹼，可以再想想生活中的例子（醋、肥皂水、檸檬汁）背後的酸鹼性差異。',
  'INe-Ⅲ-5-3': '答案對，但你還沒說清楚石蕊試紙的反應原理：藍色變紅代表酸性、紅色變藍代表鹼性。下次可以說說看顏色變化代表什麼。',
  'INe-Ⅲ-5-4': '答案對，但你還沒解釋「為什麼指示劑能判斷酸鹼」——指示劑會跟酸或鹼反應而變色，下次可以從反應的角度說明。',
  'INe-Ⅲ-5-5': '答案對，但你還沒清楚說明「酸鹼中和」的概念：酸跟鹼混合會互相抵消，產生鹽和水，不是其中一邊「贏過」另一邊。',
  'INe-Ⅲ-5-6': '答案對，但你還沒說出酸鹼反應後「產物的酸鹼性會改變」這件事，可以再想想中和後的溶液為什麼會接近中性。',
  'INe-Ⅲ-5-7': '答案對，但你還沒解釋為什麼酸鹼能解決生活問題（例如：通樂用強鹼是因為能皂化分解油垢，不只是「強」而已）。可以從反應原理的角度想想。',
};

// CORRECT + PARTIAL（答對且大致理解，但有小細節遺漏）的針對性回饋
const PARTIAL_REASONING_HINT_BY_NODE = {
  'INe-Ⅱ-3-02': '你大致理解溶解後物質還在水裡，可以再想想「粒子分散」跟「化學變化」的差別。',
  'INe-Ⅱ-3-03': '你大致掌握攪拌與溶解的關係，可以再多想想「速度」跟「總量上限」是兩件不同的事。',
  'INe-Ⅱ-3-05': '你大致掌握溶解上限的概念，可以再想想為什麼不同物質、不同溫度上限不一樣。',
  'INe-Ⅲ-5-3': '你大致掌握石蕊試紙的用法，可以再多想想顏色變化背後的酸鹼反應。',
  'INe-Ⅲ-5-4': '你大致掌握用指示劑測酸鹼的方法，可以再想想為什麼不能用嚐的或聞的。',
  'INe-Ⅲ-5-7': '你大致理解酸鹼能解決生活問題，可以再想想背後的反應原理（中和、皂化等）。',
};

function buildAiSummary(status, reasoning, isCorrect, ctx = {}) {
  const nodeId = ctx.knowledgeNodeId;
  if (status === 'CORRECT' && reasoning === 'SOLID')
    return '你能用自己的話完整解釋原理，理解很扎實！';
  if (status === 'CORRECT' && reasoning === 'PARTIAL')
    return PARTIAL_REASONING_HINT_BY_NODE[nodeId]
      || '你大致理解這個概念，個別細節可以再多想想。';
  if (status === 'CORRECT')
    return WEAK_REASONING_HINT_BY_NODE[nodeId]
      || '雖然答案選對了，但解釋的過程顯示你可能還沒完全掌握原理，可以再多花一點時間思考。';
  if (status === 'MISCONCEPTION' && isCorrect)
    return WEAK_REASONING_HINT_BY_NODE[nodeId]
      ? `${WEAK_REASONING_HINT_BY_NODE[nodeId]}（從對話中，你的想法和科學解釋還有一點差距。）`
      : '答案雖然選對了，但對話中你的想法跟科學上的解釋還有一點差距。';
  return '從你的對話中，老師看到你還持有這個迷思想法，需要再澄清一下。';
}

function finalize(ctx, reasoning, override, sourceText) {
  const { isCorrect, misconceptionId } = ctx;
  let finalStatus;
  let misconceptionCode = null;
  let changeType;

  if (override === 'UPGRADED') {
    finalStatus = 'CORRECT';
    changeType = 'UPGRADED';
  } else if (override === 'CONFIRM_MISCONCEPTION') {
    finalStatus = 'MISCONCEPTION';
    misconceptionCode = misconceptionId;
    changeType = isCorrect ? 'DOWNGRADED' : 'CONFIRMED';
  } else if (isCorrect) {
    finalStatus = 'CORRECT';
    changeType = 'CONFIRMED';
  } else {
    finalStatus = 'MISCONCEPTION';
    misconceptionCode = misconceptionId;
    changeType = 'CONFIRMED';
  }

  return {
    kind: 'final',
    finalDiagnosis: {
      finalStatus,
      misconceptionCode,
      misconceptionSource: sourceText || null,
      reasoningQuality: reasoning,
      // Rule-based fallback 不分類；CORRECT 本來就無 errorType，留 null 等教師覆寫
      errorType: null,
      aiSummary: buildAiSummary(finalStatus, reasoning, isCorrect, ctx),
      statusChange: {
        from: isCorrect ? 'CORRECT' : misconceptionId,
        to: finalStatus === 'CORRECT' ? 'CORRECT' : misconceptionCode,
        changeType,
      },
    },
  };
}
