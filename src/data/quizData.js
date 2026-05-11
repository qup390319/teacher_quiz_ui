// ═══ 考卷一：水溶液 · 迷思診斷（第一次）═══════════════════════════════════
export const defaultQuestions = [
  {
    id: 1,
    stem: '媽媽在杯子裡的水加了一匙糖，用湯匙攪一攪後，糖看不見了。請問糖跑去哪裡了？',
    knowledgeNodeId: 'INe-II-3-02',
    options: [
      { tag: 'A', content: '糖還在水裡，只是變成很小很小的粒子，眼睛看不到。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '糖不見了，已經完全消失了。', diagnosis: 'M02-1' },
      { tag: 'C', content: '糖像冰塊一樣融化了，變成水的一部分。', diagnosis: 'M02-2' },
      { tag: 'D', content: '糖跑到空氣中去了，所以看不見。', diagnosis: 'M02-3' },
    ],
  },
  {
    id: 2,
    stem: '小明在一杯水裡加了好多糖，攪了很久之後，杯底還是有一些糖沒有溶解。為什麼？',
    knowledgeNodeId: 'INe-II-3-03',
    options: [
      { tag: 'A', content: '攪得不夠用力，再多攪一下就一定能全部溶完。', diagnosis: 'M03-1' },
      { tag: 'B', content: '這杯水已經溶不下那麼多糖了，攪拌只能讓糖溶得比較快，不能溶更多。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '不攪拌的話，糖根本不會溶解。', diagnosis: 'M03-2' },
      { tag: 'D', content: '只要一直攪下去，杯底的糖一定會再溶進去。', diagnosis: 'M03-3' },
    ],
  },
  {
    id: 3,
    stem: '小華把鹽一直加進一杯水中，加到後來杯底有鹽溶不掉了。為什麼？',
    knowledgeNodeId: 'INe-II-3-05',
    options: [
      { tag: 'A', content: '一杯水能溶的鹽有限，太多就溶不了了。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '鹽沉到杯底是因為鹽比較重，不是因為溶不下。', diagnosis: 'M05-2' },
      { tag: 'C', content: '只要一直加水或加熱，就可以溶掉所有的鹽。', diagnosis: 'M05-3' },
      { tag: 'D', content: '鹽很輕會浮起來，看不到就是已經溶完了。', diagnosis: 'M05-4' },
    ],
  },
  {
    id: 4,
    stem: '老師給你一杯透明的水，要你分辨它是酸性、中性還是鹼性。你應該怎麼做？',
    knowledgeNodeId: 'INe-Ⅲ-5-4',
    options: [
      { tag: 'A', content: '用嘴巴嚐嚐看味道。', diagnosis: 'M09-1' },
      { tag: 'B', content: '用鼻子聞聞看有沒有味道。', diagnosis: 'M09-2' },
      { tag: 'C', content: '用石蕊試紙放進去，看顏色怎麼變。', diagnosis: 'CORRECT' },
      { tag: 'D', content: '看瓶子上的名字有沒有「酸」這個字。', diagnosis: 'M09-3' },
    ],
  },
  {
    id: 5,
    stem: '肥皂水是鹼性的，可以用來洗碗盤上的油漬。下面哪個說法是對的？',
    knowledgeNodeId: 'INe-Ⅲ-5-7',
    options: [
      { tag: 'A', content: '鹼性的東西都很危險，不能用在生活中。', diagnosis: 'M12-1' },
      { tag: 'B', content: '鹼性的肥皂水可以把油漬分解洗乾淨。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '肥皂水越濃就一定是強鹼，越淡就是弱鹼。', diagnosis: 'M12-2' },
      { tag: 'D', content: '酸和鹼碰在一起會互相消滅，什麼都不剩。', diagnosis: 'M12-3' },
    ],
  },
];

// ═══ 考卷二：水溶液 · 迷思診斷（第二次）═══════════════════════════════════
export const quiz002Questions = [
  {
    id: 1,
    stem: '把鹽放進水裡攪一攪，鹽看不見了，但是水變鹹了。為什麼？',
    knowledgeNodeId: 'INe-II-3-02',
    options: [
      { tag: 'A', content: '鹽已經變成另一種東西了。', diagnosis: 'M02-4' },
      { tag: 'B', content: '鹽變成很小的粒子散在水中，所以水是鹹的。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '鹽真的消失了，水的鹹味是自己跑出來的。', diagnosis: 'M02-1' },
      { tag: 'D', content: '鹽跑到空氣裡了，鹹味是水本來就有的。', diagnosis: 'M02-3' },
    ],
  },
  {
    id: 2,
    stem: '兩杯一樣多的水，各放入一樣多的糖。A 杯不攪拌，B 杯用湯匙快速攪拌。比較這兩杯水，會發現什麼？',
    knowledgeNodeId: 'INe-II-3-03',
    options: [
      { tag: 'A', content: '最後兩杯溶的糖一樣多，只是 B 杯比較快溶完。', diagnosis: 'CORRECT' },
      { tag: 'B', content: 'B 杯可以溶比較多糖，因為攪拌會讓水裝下更多糖。', diagnosis: 'M03-1' },
      { tag: 'C', content: 'A 杯的糖完全不會溶解，因為沒有攪拌。', diagnosis: 'M03-2' },
      { tag: 'D', content: '攪不攪拌都沒差，溶解速度也一樣。', diagnosis: 'M03-4' },
    ],
  },
  {
    id: 3,
    stem: '在一杯水中一直加糖並攪拌，加到水溶不下為止。你會看到什麼？',
    knowledgeNodeId: 'INe-II-3-05',
    options: [
      { tag: 'A', content: '多出來的糖會沉在杯底，因為這杯水已經溶不下了。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '糖沉在杯底只是因為太重，再多攪一下就會溶了。', diagnosis: 'M05-2' },
      { tag: 'C', content: '水可以一直溶糖，不可能溶不下。', diagnosis: 'M05-3' },
      { tag: 'D', content: '加熱可以讓全部的糖溶掉，但冷了又會全部跑出來。', diagnosis: 'M05-1' },
    ],
  },
  {
    id: 4,
    stem: '把紫色石蕊試紙放進小蘇打水裡，試紙變成藍色了。這表示小蘇打水是什麼性質？',
    knowledgeNodeId: 'INe-Ⅲ-5-4',
    options: [
      { tag: 'A', content: '酸性，因為名字裡沒有「酸」這個字。', diagnosis: 'M09-3' },
      { tag: 'B', content: '鹼性，因為石蕊試紙碰到鹼性液體會變藍色。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '中性，因為小蘇打水沒有特別的味道。', diagnosis: 'M09-2' },
      { tag: 'D', content: '鹼性，因為喝起來不酸也不鹹。', diagnosis: 'M09-4' },
    ],
  },
  {
    id: 5,
    stem: '被蜜蜂叮到時皮膚會又痛又癢，因為蜜蜂的毒液是酸性的。怎樣做比較好？',
    knowledgeNodeId: 'INe-Ⅲ-5-7',
    options: [
      { tag: 'A', content: '酸性的東西都很危險，千萬不能碰。', diagnosis: 'M12-1' },
      { tag: 'B', content: '塗一點鹼性的小蘇打水，可以幫忙止癢。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '趕快塗檸檬汁，因為酸加酸可以消除。', diagnosis: 'M12-3' },
      { tag: 'D', content: '被酸性的東西碰到一定會爛掉，要馬上去醫院。', diagnosis: 'M12-4' },
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
