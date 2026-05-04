/**
 * 第二層 AI 追問引擎（純前端模擬）
 *
 * 純函式，依學生回覆動態決定下一輪追問或最終診斷。
 * 因為原型尚未接後端 LLM，使用模板＋啟發式判讀來模擬：
 *   - 文字長度與模糊關鍵詞 → 偵測「不知道／猜的」
 *   - 知識節點關鍵詞 → 偵測「正確概念」
 *   - 對應四種情境（A 模糊 / B 錯誤推理 / C 正確完整 / D 答對但理由錯）
 *
 * 規格：spec-05 §2.2、scratch 文件 §3.5
 */

import { getMisconceptionById } from '../../../data/knowledgeGraph';

// 模糊關鍵詞：用較具體的短語避免誤觸常見否定句（如「不會因為」「我感覺糖⋯」）
const FUZZY_KEYWORDS = ['不知道', '我不會', '忘記了', '猜的', '沒想法',
  '不確定', '亂選', '隨便選', '老師說', '上課有講', '課本上'];

// 各知識節點的「正確概念」關鍵詞——用來判讀學生是否真的理解
const NODE_CORRECT_KEYWORDS = {
  'INe-II-3-02': ['粒子', '分散', '看不見', '還在', '蒸發', '存在', '結晶', '變小', '小小的', '微小'],
  'INe-II-3-03': ['速度', '變快', '加快', '上限', '總量', '一樣多', '不會更多', '飽和', '量是固定'],
  'INe-II-3-05': ['上限', '飽和', '溶不下', '沉澱', '沉到', '極限', '最多', '超過', '溶不了'],
  'INe-Ⅲ-5-4': ['石蕊', '試紙', '變色', '紅', '藍', '指示劑', '顏色', '紫色高麗菜'],
  'INe-Ⅲ-5-7': ['中和', '酸鹼', '油脂', '清潔', '緩解', '分解', '工具', '反應', '生成'],
};

// ── Round 2 模板 ────────────────────────────────────────────────────
// 情境 A：模糊回覆 → 提供具體情境引導
const R2_FUZZY = {
  'INe-II-3-02': '老師想到一個情境——把糖水放著好幾天都沒有打開，這杯水嚐起來還會是甜的嗎？為什麼？',
  'INe-II-3-03': '我想問你一個情境：兩杯一樣的水各加 5 公克糖，一杯快速攪拌、一杯不動。最後兩杯能溶解的糖會一樣多嗎？',
  'INe-II-3-05': '想想看：一杯水加糖加到杯底已經有糖溶不掉，這時候再用力攪拌一個小時，那些沉下去的糖會溶進去嗎？',
  'INe-Ⅲ-5-4': '想一想：如果只用聞的或嚐的，能不能準確分出哪一杯是酸性、哪一杯是鹼性？',
  'INe-Ⅲ-5-7': '想一想：醋是酸性的、肥皂水是鹼性的，這兩個都是生活中常見的東西，它們真的都很危險嗎？',
};

// 情境 B：明確但呼應迷思 → 對比情境（依 misconception ID）
const R2_CONTRAST_BY_MISCON = {
  // M02-* 溶解現象
  'M02-1': '那如果把這杯糖水拿去加熱，等水蒸發掉了，杯底會看到什麼？',
  'M02-2': '老師想問：糖溶在水裡，跟冰塊在杯子裡融化，這兩個過程一樣嗎？',
  'M02-3': '那如果把糖水蓋上蓋子放著，水蒸發出來的水蒸氣是甜的嗎？為什麼？',
  'M02-4': '想想看：糖溶在水裡之後，如果再把水蒸發掉，會看到原本的糖嗎？',
  // M03-* 攪拌與溶解
  'M03-1': '我想問你一個情境：兩杯水都已經溶不下糖了，一杯繼續用力攪拌一個小時，一杯放著。最後溶解的糖會一樣多嗎？',
  'M03-2': '想想看：把方糖丟進熱開水裡完全不去攪它，過一段時間再回來看，方糖會有什麼變化？',
  'M03-3': '老師想問：杯底已經沉下去的糖，只要繼續攪拌，它會慢慢溶回水裡嗎？',
  'M03-4': '想一想：糖加進水裡，攪拌跟不攪拌，糖溶解的速度真的一模一樣嗎？',
  // M05-* 溶解量上限
  'M05-1': '那如果加熱讓糖完全溶完之後，蓋著放一個禮拜再來看，糖還會在水裡嗎？',
  'M05-2': '想一想：如果只是因為糖比較重才沉到杯底，那為什麼水中還是甜的，糖沒有全部沉下去？',
  'M05-3': '想想看：一杯水加糖加到沉澱之後，再多加 10 公克糖會發生什麼？',
  'M05-4': '老師想問：糖溶解後是會浮在水面，還是均勻分散在水中？喝起來上下會一樣甜嗎？',
  // M09-* 酸鹼判斷
  'M09-1': '那如果一杯水嚐起來鹹鹹的，但石蕊試紙沒有變藍，它是鹼性嗎？',
  'M09-2': '想一想：純水沒有刺鼻味、糖水也沒有刺鼻味，它們都是中性嗎？那氨水沒有刺鼻味就一定是中性嗎？',
  'M09-3': '想想看：「醋」名字裡沒有「酸」字，那它是不是酸性？',
  'M09-4': '老師想問：用嘴巴嚐水溶液會不會有危險？而且每個人感覺都一樣嗎？',
  // M12-* 酸鹼解決生活問題
  'M12-1': '那為什麼平常還會用醋去除水垢、用小蘇打水緩解蜜蜂叮咬呢？酸鹼一定都很危險嗎？',
  'M12-2': '想一想：一杯很濃很濃的糖水，它是強酸還是強鹼？「濃度高」跟「酸性強」是同一件事嗎？',
  'M12-3': '老師想問：酸與鹼中和後，產生的東西真的憑空消失了嗎？還是變成別的東西（像水跟鹽）？',
  'M12-4': '想一想：檸檬酸、胺基酸名字裡都有「酸」字，但它們在食物裡常常出現，會傷害身體嗎？',
};

// 情境 C：答對且回覆呼應正確概念 → 延伸確認
const R2_DEEPEN = {
  'INe-II-3-02': '你提到糖還在水裡——那你覺得它變成什麼樣子了？我們為什麼看不到它？',
  'INe-II-3-03': '你說攪拌會加快——那如果想讓更多糖溶進去，光靠攪拌做得到嗎？',
  'INe-II-3-05': '你說會沉到杯底——那是不是不管多濃的糖水，再加都會沉底？',
  'INe-Ⅲ-5-4': '你提到石蕊試紙變色——那紅色代表什麼？藍色又代表什麼？',
  'INe-Ⅲ-5-7': '你說可以用酸鹼解決生活問題——那要怎麼判斷某個情境該用酸還是用鹼？',
};

// 情境 D：答對但回覆模糊或無關 → 釐清是否猜測（遷移到新情境）
const R2_GUESS = {
  'INe-II-3-02': '老師換一個情境問你：把鹽加進熱湯裡攪一攪，鹽看不見了，但喝起來鹹鹹的——你覺得鹽到哪裡去了？',
  'INe-II-3-03': '老師換一個情境：兩杯一樣的水都加 5 公克糖，一杯放著、一杯快速攪拌——你覺得最後兩杯能溶的糖一樣多嗎？',
  'INe-II-3-05': '老師換一個情境：一杯水中糖加到再也溶不下去了，這時候再加更多糖會發生什麼？',
  'INe-Ⅲ-5-4': '老師換一個情境：把石蕊試紙放進肥皂水裡，試紙變藍了——你覺得肥皂水是酸性、中性還是鹼性？',
  'INe-Ⅲ-5-7': '老師換一個情境：廚房水龍頭結了一層白白的水垢，要用酸性還是鹼性的東西來清呢？為什麼？',
};

// ── Round 3 模板 ────────────────────────────────────────────────────
// 情境 A → 二選一比較（降低開放度）
const R3_AB = {
  'INe-II-3-02': '最後一個問題！兩個想法你覺得哪個比較接近你？\n（A）糖溶到水裡之後就消失不見了。\n（B）糖變成超小的粒子分散在水裡，水蒸發後還能看到。',
  'INe-II-3-03': '最後一個問題！哪個想法比較接近你？\n（A）攪拌得越用力、越久，能溶下去的糖就越多。\n（B）攪拌只能讓糖溶得更快，但能溶的糖總量是固定的。',
  'INe-II-3-05': '最後一個問題！哪個想法比較接近你？\n（A）只要持續加水或加熱，糖可以無限溶解下去。\n（B）一杯水能溶解的糖有上限，超過就會沉到杯底。',
  'INe-Ⅲ-5-4': '最後一個問題！哪個想法比較接近你？\n（A）用嚐的或聞的就能準確判斷酸鹼。\n（B）要用石蕊試紙之類的指示劑才能準確判斷酸鹼。',
  'INe-Ⅲ-5-7': '最後一個問題！哪個想法比較接近你？\n（A）所有酸鹼物質都很危險，最好都不要靠近。\n（B）酸鹼是工具，正確使用可以幫忙清潔、止癢。',
};

// 情境 D → 遷移測試
const R3_TRANSFER = {
  'INe-II-3-02': '我們再想一個情境：把一杯鹽水放到太陽底下曬乾，杯底會看到什麼？為什麼？',
  'INe-II-3-03': '我們再想一個情境：把同量的糖加進兩杯水，一杯快速攪拌、一杯靜置。過半小時兩杯能溶的糖會一樣多嗎？',
  'INe-II-3-05': '我們再想一個情境：在同一杯水中糖加到再也溶不下，再加 5 公克糖會怎樣？為什麼？',
  'INe-Ⅲ-5-4': '我們再想一個情境：拿一杯不知名的透明液體，要怎麼判斷它是酸性、鹼性還是中性？',
  'INe-Ⅲ-5-7': '我們再想一個情境：水管被油脂堵住，你會建議倒酸性還是鹼性的清潔劑？為什麼？',
};

// ── 純函式：分析學生回覆 ─────────────────────────────────────────────
const isFuzzyReply = (t) => {
  const trimmed = (t || '').trim();
  if (trimmed.length < 10) return true;
  return FUZZY_KEYWORDS.some((k) => trimmed.includes(k));
};

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
  return isCorrect
    ? `你選了「${safe}」，能跟老師說說你是怎麼想的嗎？`
    : `你選了「${safe}」，老師想聽聽你的想法——為什麼覺得這個最合理？`;
}

/**
 * 處理學生回覆，產出下一步 (next 追問 / final 診斷)。
 * @param {object} ctx - { round, strategy, isCorrect, misconceptionId, knowledgeNodeId }
 * @param {string} reply - 學生的最新回覆
 * @returns {object} { kind: 'next' | 'final', aiMessage?, strategy?, finalDiagnosis? }
 */
export function processStudentReply(ctx, reply) {
  const fuzzy = isFuzzyReply(reply);
  const matchesCorrect = mentionsCorrectConcept(reply, ctx.knowledgeNodeId);

  if (ctx.round === 1) return handleAfterRound1(ctx, fuzzy, matchesCorrect);
  if (ctx.round === 2) return handleAfterRound2(ctx, reply, fuzzy, matchesCorrect);
  return handleAfterRound3(ctx, reply, fuzzy, matchesCorrect);
}

function handleAfterRound1(ctx, fuzzy, matchesCorrect) {
  const { isCorrect, knowledgeNodeId, misconceptionId } = ctx;

  if (isCorrect && matchesCorrect && !fuzzy) {
    return {
      kind: 'next',
      strategy: 'deepen',
      aiMessage: R2_DEEPEN[knowledgeNodeId]
        || '你說的有道理！能不能再多說一點你怎麼想到的？',
    };
  }
  if (isCorrect) {
    return {
      kind: 'next',
      strategy: 'guess',
      aiMessage: R2_GUESS[knowledgeNodeId]
        || '老師換一個情境問你：把這個概念用到別的地方，你覺得會發生什麼？',
    };
  }
  if (fuzzy) {
    return {
      kind: 'next',
      strategy: 'fuzzy',
      aiMessage: R2_FUZZY[knowledgeNodeId]
        || '老師想到一個情境，想聽聽你的看法⋯⋯',
    };
  }
  return {
    kind: 'next',
    strategy: 'contrast',
    aiMessage: R2_CONTRAST_BY_MISCON[misconceptionId]
      || '那我想問你一個情境，你覺得會發生什麼？',
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
      const m = ctx.misconceptionId ? getMisconceptionById(ctx.misconceptionId) : null;
      const cue = m ? `「${m.label}」這個想法` : '剛才那個想法';
      return {
        kind: 'next',
        strategy: 'source',
        aiMessage: `你剛才提到${cue}——你是什麼時候開始這樣覺得的？是平常生活的經驗，還是課本上看過的呢？`,
      };
    }

    case 'fuzzy':
      // 情境 A 第 2 輪：仍模糊或答非所問 → Round 3 二選一
      return {
        kind: 'next',
        strategy: 'ab',
        aiMessage: R3_AB[ctx.knowledgeNodeId]
          || '兩個想法你覺得哪個比較接近你？',
      };

    case 'guess':
      // 情境 D 第 2 輪：若能用正確概念解釋遷移情境 → PARTIAL 結束
      if (matchesCorrect && !fuzzy) return finalize(ctx, 'PARTIAL');
      return {
        kind: 'next',
        strategy: 'transfer',
        aiMessage: R3_TRANSFER[ctx.knowledgeNodeId]
          || '我們再想一個情境，你覺得會發生什麼？為什麼？',
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

function buildAiSummary(status, reasoning, isCorrect) {
  if (status === 'CORRECT' && reasoning === 'SOLID')
    return '你能用自己的話完整解釋原理，理解很扎實！';
  if (status === 'CORRECT' && reasoning === 'PARTIAL')
    return '你大致理解這個概念，個別細節可以再多想想。';
  if (status === 'CORRECT')
    return '雖然答案選對了，但解釋的過程顯示你可能還沒完全掌握原理，可以再多花一點時間思考。';
  if (status === 'MISCONCEPTION' && isCorrect)
    return '答案雖然選對了，但對話中你的想法跟科學上的解釋還有一點差距。';
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
      aiSummary: buildAiSummary(finalStatus, reasoning, isCorrect),
      statusChange: {
        from: isCorrect ? 'CORRECT' : misconceptionId,
        to: finalStatus === 'CORRECT' ? 'CORRECT' : misconceptionCode,
        changeType,
      },
    },
  };
}
