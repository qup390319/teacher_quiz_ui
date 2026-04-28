// ═══ 考卷一：水溶液 · 迷思診斷（第一次）═══════════════════════════════════
export const defaultQuestions = [
  {
    id: 1,
    stem: '媽媽把一匙糖加入熱開水並攪拌，糖看不見了，這時候糖到哪裡去了？',
    knowledgeNodeId: 'INe-II-3-02',
    options: [
      { tag: 'A', content: '糖變成肉眼看不見的小粒子分散在水裡，仍然存在於水中。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '糖完全消失了，已經不在水裡。', diagnosis: 'M02-1' },
      { tag: 'C', content: '糖像冰塊一樣融化了，已經變成水的一部分。', diagnosis: 'M02-2' },
      { tag: 'D', content: '糖蒸發到空氣中了，所以看不見。', diagnosis: 'M02-3' },
    ],
  },
  {
    id: 2,
    stem: '小明在 100 毫升的水中加入很多糖，攪拌一陣子後杯底仍有糖沒溶完。下列敘述何者最正確？',
    knowledgeNodeId: 'INe-II-3-03',
    options: [
      { tag: 'A', content: '只要攪拌得更用力、攪久一點，剩下的糖就一定能全部溶解。', diagnosis: 'M03-1' },
      { tag: 'B', content: '攪拌只能加快糖溶解的速度，無法讓更多的糖溶進這杯水裡。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '沒有攪拌的話，糖根本不會溶解。', diagnosis: 'M03-2' },
      { tag: 'D', content: '持續攪拌，沉在杯底的糖也會跟著重新溶解進水裡。', diagnosis: 'M03-3' },
    ],
  },
  {
    id: 3,
    stem: '小華把鹽一直加進一杯水中，加到最後杯底開始有鹽溶不掉。下列哪個說法最正確？',
    knowledgeNodeId: 'INe-II-3-05',
    options: [
      { tag: 'A', content: '一杯水能溶解的鹽量有上限，超過就會沉澱。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '鹽沉到杯底是因為鹽比水重，與溶解量上限無關。', diagnosis: 'M05-2' },
      { tag: 'C', content: '只要不斷加熱與加水，這杯水可以溶解任何量的鹽。', diagnosis: 'M05-3' },
      { tag: 'D', content: '鹽是破碎狀比較輕會浮上來，沒看到就是已經溶完了。', diagnosis: 'M05-4' },
    ],
  },
  {
    id: 4,
    stem: '要判斷一杯透明的水溶液是酸性、中性還是鹼性，最適合的方法是？',
    knowledgeNodeId: 'INe-Ⅲ-5-4',
    options: [
      { tag: 'A', content: '用嘴巴嚐看看，鹹的就是鹼性。', diagnosis: 'M09-1' },
      { tag: 'B', content: '聞看看，沒有刺鼻味就是中性。', diagnosis: 'M09-2' },
      { tag: 'C', content: '用石蕊試紙浸入水溶液中，依顏色變化判斷。', diagnosis: 'CORRECT' },
      { tag: 'D', content: '看名稱中有沒有「酸」字，沒有就一定不是酸性。', diagnosis: 'M09-3' },
    ],
  },
  {
    id: 5,
    stem: '水管被堵住時，可以倒入鹼性的通樂（含氫氧化鈉）來通水管。下列敘述何者最正確？',
    knowledgeNodeId: 'INe-Ⅲ-5-7',
    options: [
      { tag: 'A', content: '鹼性物質都有毒，絕對不能拿來做家庭清潔。', diagnosis: 'M12-1' },
      { tag: 'B', content: '通樂能把水管裡的油脂等阻塞物分解掉。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '通樂越濃就一定越強鹼，越稀就是弱鹼。', diagnosis: 'M12-2' },
      { tag: 'D', content: '鹼性遇到酸性會把彼此完全消滅變成虛無。', diagnosis: 'M12-3' },
    ],
  },
];

// ═══ 考卷二：水溶液 · 迷思診斷（第二次）═══════════════════════════════════
export const quiz002Questions = [
  {
    id: 1,
    stem: '把鹽放進水裡攪一攪後鹽看不見了，過一會兒水嚐起來仍是鹹的。這代表？',
    knowledgeNodeId: 'INe-II-3-02',
    options: [
      { tag: 'A', content: '鹽已經不是原來的鹽，溶解過程把鹽變成另一種物質。', diagnosis: 'M02-4' },
      { tag: 'B', content: '鹽變成肉眼看不見的小粒子均勻分散在水中。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '鹽真的不見了，只是水的味道剛好變鹹。', diagnosis: 'M02-1' },
      { tag: 'D', content: '鹽蒸發了，鹹味是水自己變的。', diagnosis: 'M02-3' },
    ],
  },
  {
    id: 2,
    stem: '兩杯一樣的水各加入 5 公克糖，A 杯不攪拌、B 杯快速攪拌。最後比較兩杯，會發現？',
    knowledgeNodeId: 'INe-II-3-03',
    options: [
      { tag: 'A', content: '兩杯能溶解的糖量相同，只是 B 杯溶解得比較快。', diagnosis: 'CORRECT' },
      { tag: 'B', content: 'B 杯能溶解的糖比 A 杯多，因為攪拌會讓水容納更多糖。', diagnosis: 'M03-1' },
      { tag: 'C', content: 'A 杯的糖完全沒有溶解，因為沒攪拌就不會溶解。', diagnosis: 'M03-2' },
      { tag: 'D', content: '兩杯溶解情況完全一樣，攪拌不會加快也不會增加。', diagnosis: 'M03-4' },
    ],
  },
  {
    id: 3,
    stem: '在室溫下，把糖一直加入同一杯水並攪拌。當水中已經溶不下時你會看到？',
    knowledgeNodeId: 'INe-II-3-05',
    options: [
      { tag: 'A', content: '多餘的糖會沉到杯底，因為水能溶解的糖量有極限。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '多餘的糖只是因為比較重而沉底，再攪拌、加熱還會繼續溶。', diagnosis: 'M05-2' },
      { tag: 'C', content: '水可以無限溶解糖，看到沉澱代表還沒攪拌均勻。', diagnosis: 'M05-3' },
      { tag: 'D', content: '加熱可以讓糖暫時全溶，但放一段時間後又會全部沉澱出來。', diagnosis: 'M05-1' },
    ],
  },
  {
    id: 4,
    stem: '將紫色石蕊試紙浸入小蘇打水中，試紙變成藍色。這代表小蘇打水是？',
    knowledgeNodeId: 'INe-Ⅲ-5-4',
    options: [
      { tag: 'A', content: '酸性，因為「小蘇打」這個名稱沒有「酸」字。', diagnosis: 'M09-3' },
      { tag: 'B', content: '鹼性，因為紫色石蕊試紙在鹼性溶液中會變成藍色。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '中性，因為小蘇打水沒有刺鼻味。', diagnosis: 'M09-2' },
      { tag: 'D', content: '鹼性，因為小蘇打水嚐起來不是酸的也不是鹹的。', diagnosis: 'M09-4' },
    ],
  },
  {
    id: 5,
    stem: '被蜜蜂叮咬時皮膚會痛癢，這是因為蜜蜂的毒液偏酸性。下列建議何者最合適？',
    knowledgeNodeId: 'INe-Ⅲ-5-7',
    options: [
      { tag: 'A', content: '不要碰它，所有酸都很危險、有毒，碰了會更糟。', diagnosis: 'M12-1' },
      { tag: 'B', content: '塗一點偏鹼性的小蘇打水，可以幫助緩解。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '馬上塗檸檬汁，因為酸與酸可以互相消滅。', diagnosis: 'M12-3' },
      { tag: 'D', content: '因為有「酸」字，皮膚一定會被腐蝕壞死，要立刻送醫。', diagnosis: 'M12-4' },
    ],
  },
];

// ═══ 考卷 → 題目對照表 ══════════════════════════════════════════════════════
const QUIZ_QUESTIONS = {
  'quiz-001': defaultQuestions,
  'quiz-002': quiz002Questions,
};

export const getQuizQuestions = (quizId) => QUIZ_QUESTIONS[quizId] || [];

// ═══ 各班學生名單 ════════════════════════════════════════════════════════════
const CLASS_STUDENTS = {
  'class-A': [
    '王小明', '李美玲', '張志豪', '陳佳慧', '林俊傑',
    '黃雅婷', '吳建宏', '劉淑芬', '蔡宗翰', '鄭雨晴',
    '許文彬', '謝欣妤', '楊偉誠', '賴芷瑄', '蕭明哲',
    '周怡君', '江柏宇', '洪佩珊', '邱振源', '盧雅文',
  ],
  'class-B': [
    '陳大同', '林小花', '黃建民', '吳美華', '張偉強',
    '李淑貞', '王志明', '陳雅琪', '林宗翰', '劉怡君',
    '蔡明哲', '鄭佩珊', '許俊傑', '謝芷瑄', '楊雅婷',
    '賴文彬', '江柏宇', '洪振源',
  ],
  'class-C': [
    '周明德', '吳珊珊', '林志成', '陳雅雯', '張文昌',
    '黃淑惠', '王建華', '李秀英', '蔡志遠', '鄭美玲',
    '許家豪', '謝宜庭', '楊承翰', '賴佳蓉', '蕭宗霖',
    '周欣怡', '江育誠', '洪雅萍', '邱冠廷', '盧亭妤',
    '方俊霖', '施雅筑',
  ],
};

// ═══ 各 quiz×class 的作答分佈 ════════════════════════════════════════════════
// 分佈樣態維持原本「五年甲班中等／五年乙班略低／五年丙班最低／第二次施測甲班進步」的劇情。
const ANSWER_DISTRIBUTIONS_MAP = {
  // ── quiz-001 × class-A（20 人）── 整體中等表現
  'quiz-001__class-A': [
    // Q1 correct=A：8A, 6B, 4C, 2D（40%）
    ['A','A','A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','D','D'],
    // Q2 correct=B：7A, 7B, 4C, 2D（35%）
    ['A','A','A','A','A','A','A','B','B','B','B','B','B','B','C','C','C','C','D','D'],
    // Q3 correct=A：9A, 5B, 4C, 2D（45%）
    ['A','A','A','A','A','A','A','A','A','B','B','B','B','B','C','C','C','C','D','D'],
    // Q4 correct=C：3A, 4B, 6C, 7D（30%）
    ['A','A','A','B','B','B','B','C','C','C','C','C','C','D','D','D','D','D','D','D'],
    // Q5 correct=B：4A, 10B, 4C, 2D（50%）
    ['A','A','A','A','B','B','B','B','B','B','B','B','B','B','C','C','C','C','D','D'],
  ],
  // ── quiz-001 × class-B（18 人）── 略低於甲班
  'quiz-001__class-B': [
    // Q1 correct=A：6A, 5B, 4C, 3D（33%）
    ['A','A','A','A','A','A','B','B','B','B','B','C','C','C','C','D','D','D'],
    // Q2 correct=B：5A, 6B, 4C, 3D（33%）
    ['A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','D','D','D'],
    // Q3 correct=A：8A, 4B, 4C, 2D（44%）
    ['A','A','A','A','A','A','A','A','B','B','B','B','C','C','C','C','D','D'],
    // Q4 correct=C：3A, 5B, 4C, 6D（22%）
    ['A','A','A','B','B','B','B','B','C','C','C','C','D','D','D','D','D','D'],
    // Q5 correct=B：4A, 8B, 4C, 2D（44%）
    ['A','A','A','A','B','B','B','B','B','B','B','B','C','C','C','C','D','D'],
  ],
  // ── quiz-001 × class-C（22 人）── 最低，需要關注
  'quiz-001__class-C': [
    // Q1 correct=A：7A, 5B, 5C, 5D（32%）
    ['A','A','A','A','A','A','A','B','B','B','B','B','C','C','C','C','C','D','D','D','D','D'],
    // Q2 correct=B：8A, 6B, 4C, 4D（27%）
    ['A','A','A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','D','D','D','D'],
    // Q3 correct=A：9A, 6B, 4C, 3D（41%）
    ['A','A','A','A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','D','D','D'],
    // Q4 correct=C：5A, 5B, 4C, 8D（18%）
    ['A','A','A','A','A','B','B','B','B','B','C','C','C','C','D','D','D','D','D','D','D','D'],
    // Q5 correct=B：5A, 9B, 4C, 4D（41%）
    ['A','A','A','A','A','B','B','B','B','B','B','B','B','B','C','C','C','C','D','D','D','D'],
  ],
  // ── quiz-002 × class-A（20 人）── 第二次施測，掌握率有改善
  'quiz-002__class-A': [
    // Q1 correct=B：4A, 12B, 2C, 2D（60%）
    ['A','A','A','A','B','B','B','B','B','B','B','B','B','B','B','B','C','C','D','D'],
    // Q2 correct=A：12A, 3B, 3C, 2D（60%）
    ['A','A','A','A','A','A','A','A','A','A','A','A','B','B','B','C','C','C','D','D'],
    // Q3 correct=A：10A, 4B, 3C, 3D（50%）
    ['A','A','A','A','A','A','A','A','A','A','B','B','B','B','C','C','C','D','D','D'],
    // Q4 correct=B：3A, 11B, 3C, 3D（55%）
    ['A','A','A','B','B','B','B','B','B','B','B','B','B','B','C','C','C','D','D','D'],
    // Q5 correct=B：3A, 12B, 3C, 2D（60%）
    ['A','A','A','B','B','B','B','B','B','B','B','B','B','B','B','C','C','C','D','D'],
  ],
};

// ═══ 取得班級作答資料 ════════════════════════════════════════════════════════
export const getClassAnswers = (quizId, classId) => {
  const key = `${quizId}__${classId}`;
  const students = CLASS_STUDENTS[classId] || [];
  const distributions = ANSWER_DISTRIBUTIONS_MAP[key];
  if (!distributions) return [];
  const questions = getQuizQuestions(quizId);
  return students.map((name, i) => ({
    studentId: i + 1,
    studentName: name,
    answers: questions.map((q, qIdx) => ({
      questionId: q.id,
      selectedTag: distributions[qIdx][i],
    })),
  }));
};

// 保留向下相容的匯出
export const classAnswers = getClassAnswers('quiz-001', 'class-A');

// ═══ 帶參數的診斷函式 ════════════════════════════════════════════════════════

export const getQuestionStats = (questionIndex, quizId = 'quiz-001', classId = 'class-A') => {
  const key = `${quizId}__${classId}`;
  const distributions = ANSWER_DISTRIBUTIONS_MAP[key];
  if (!distributions || !distributions[questionIndex]) return { A: 0, B: 0, C: 0, D: 0 };
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  distributions[questionIndex].forEach((tag) => counts[tag]++);
  return counts;
};

export const getMisconceptionStudents = (quizId = 'quiz-001', classId = 'class-A') => {
  const answers = getClassAnswers(quizId, classId);
  const questions = getQuizQuestions(quizId);
  const result = {};
  answers.forEach(({ studentName, answers: ans }) => {
    ans.forEach(({ questionId, selectedTag }) => {
      const question = questions.find((q) => q.id === questionId);
      const option = question.options.find((o) => o.tag === selectedTag);
      if (option.diagnosis !== 'CORRECT') {
        if (!result[option.diagnosis]) result[option.diagnosis] = [];
        result[option.diagnosis].push(studentName);
      }
    });
  });
  return result;
};

export const getNodePassRates = (quizId = 'quiz-001', classId = 'class-A') => {
  const answers = getClassAnswers(quizId, classId);
  const questions = getQuizQuestions(quizId);
  const nodeCorrect = {};
  answers.forEach(({ answers: ans }) => {
    ans.forEach(({ questionId, selectedTag }) => {
      const question = questions.find((q) => q.id === questionId);
      const option = question.options.find((o) => o.tag === selectedTag);
      const nodeId = question.knowledgeNodeId;
      if (!nodeCorrect[nodeId]) nodeCorrect[nodeId] = { correct: 0, total: 0 };
      nodeCorrect[nodeId].total++;
      if (option.diagnosis === 'CORRECT') nodeCorrect[nodeId].correct++;
    });
  });
  const rates = {};
  Object.entries(nodeCorrect).forEach(([nodeId, { correct, total }]) => {
    rates[nodeId] = Math.round((correct / total) * 100);
  });
  return rates;
};

// ═══ 考卷庫靜態資料 ═════════════════════════════════════════════════════════
export const QUIZZES_DATA = [
  {
    id: 'quiz-001',
    title: '水溶液 · 迷思診斷（第一次）',
    status: 'published',
    questionCount: 5,
    knowledgeNodeIds: ['INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7'],
    questions: defaultQuestions,
    createdAt: '2024-03-01',
  },
  {
    id: 'quiz-002',
    title: '水溶液 · 迷思診斷（第二次）',
    status: 'published',
    questionCount: 5,
    knowledgeNodeIds: ['INe-II-3-02', 'INe-II-3-03', 'INe-II-3-05', 'INe-Ⅲ-5-4', 'INe-Ⅲ-5-7'],
    questions: quiz002Questions,
    createdAt: '2024-03-20',
  },
];
