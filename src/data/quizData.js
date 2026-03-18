// ═══ 考卷一：溫度與熱 · 迷思診斷（第一次）═══════════════════════════════════
export const defaultQuestions = [
  {
    id: 1,
    stem: '冬天摸公園的鐵椅覺得很冰，摸木頭長椅卻不會，是因為？',
    knowledgeNodeId: 'INa-Ⅲ-8-01',
    options: [
      { tag: 'A', content: '鐵椅的溫度本來就比木頭低。', diagnosis: 'M01-1' },
      { tag: 'B', content: '鐵的熱傳導速度較快，帶走手的熱較快。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '鐵會產生冷氣並傳遞給手。', diagnosis: 'M01-3' },
      { tag: 'D', content: '「冷」在鐵中傳播的速度比木頭快。', diagnosis: 'M01-2' },
    ],
  },
  {
    id: 2,
    stem: '在冷氣房內，冷風通常會從上方吹出，主要是因為冷空氣會？',
    knowledgeNodeId: 'INa-Ⅲ-8-03',
    options: [
      { tag: 'A', content: '受熱脹冷縮影響向上升。', diagnosis: 'M03-1' },
      { tag: 'B', content: '密度較大而向下沉。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '停留在原處直到變熱。', diagnosis: 'M03-3' },
      { tag: 'D', content: '沿著牆壁水平移動。', diagnosis: 'M03-2' },
    ],
  },
  {
    id: 3,
    stem: '陽光下撐一把淺色的雨傘，感覺比直接曬太陽涼快，是因為？',
    knowledgeNodeId: 'INa-Ⅲ-8-05',
    options: [
      { tag: 'A', content: '淺色傘阻擋了太陽的熱輻射。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '傘面會主動釋放出冷氣。', diagnosis: 'M05-1' },
      { tag: 'C', content: '淺色傘會吸收所有的熱輻射。', diagnosis: 'M05-2' },
      { tag: 'D', content: '傘下的空氣不會產生對流。', diagnosis: 'M05-4' },
    ],
  },
  {
    id: 4,
    stem: '為什麼保溫杯的夾層通常會抽成真空？',
    knowledgeNodeId: 'INa-Ⅲ-8-06',
    options: [
      { tag: 'A', content: '為了減輕保溫杯的總重量。', diagnosis: 'M06-4' },
      { tag: 'B', content: '真空能阻斷熱傳導與熱對流。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '真空層能主動產生熱能保溫。', diagnosis: 'M06-1' },
      { tag: 'D', content: '真空可以把冷氣封在裡面。', diagnosis: 'M06-2' },
    ],
  },
  {
    id: 5,
    stem: '電腦主機後面安裝風扇向外吹，主要是為了？',
    knowledgeNodeId: 'Na-Ⅲ-8-07',
    options: [
      { tag: 'A', content: '讓外面的新鮮空氣進入內部。', diagnosis: 'M07-3' },
      { tag: 'B', content: '加快對流運動將內部熱能帶走。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '風扇轉動時會產生冷風。', diagnosis: 'M07-1' },
      { tag: 'D', content: '防止熱輻射擴散到外面。', diagnosis: 'M07-4' },
    ],
  },
];

// ═══ 考卷二：溫度與熱 · 迷思診斷（第二次）═══════════════════════════════════
export const quiz002Questions = [
  {
    id: 1,
    stem: '將一根鐵湯匙和一根木筷子同時放入熱水中，過一會兒握住末端，你會發現？',
    knowledgeNodeId: 'INa-Ⅲ-8-01',
    options: [
      { tag: 'A', content: '鐵湯匙的末端明顯變燙，因為鐵的熱傳導速度較快。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '兩者末端溫度一樣，因為都泡在同一杯水中。', diagnosis: 'M01-1' },
      { tag: 'C', content: '木筷子末端比較燙，因為木頭會吸收更多熱。', diagnosis: 'M01-3' },
      { tag: 'D', content: '鐵湯匙會把「冷」傳到手上，所以感覺涼涼的。', diagnosis: 'M01-2' },
    ],
  },
  {
    id: 2,
    stem: '在一間關閉門窗的房間中，點燃一根蚊香放在地板上，煙會先往哪個方向飄？',
    knowledgeNodeId: 'INa-Ⅲ-8-03',
    options: [
      { tag: 'A', content: '往上飄，因為蚊香周圍的空氣受熱上升。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '往下沉，因為煙的密度比空氣大。', diagnosis: 'M03-2' },
      { tag: 'C', content: '水平擴散，因為室內沒有風。', diagnosis: 'M03-3' },
      { tag: 'D', content: '停在原處不動，因為門窗關閉沒有對流。', diagnosis: 'M03-1' },
    ],
  },
  {
    id: 3,
    stem: '夏天時，穿深色衣服比穿淺色衣服更容易覺得熱，主要原因是？',
    knowledgeNodeId: 'INa-Ⅲ-8-05',
    options: [
      { tag: 'A', content: '深色衣服本身會產生熱能。', diagnosis: 'M05-1' },
      { tag: 'B', content: '深色衣服吸收較多太陽的熱輻射。', diagnosis: 'CORRECT' },
      { tag: 'C', content: '深色衣服會阻止身體散熱。', diagnosis: 'M05-4' },
      { tag: 'D', content: '淺色衣服會主動製造涼爽感。', diagnosis: 'M05-2' },
    ],
  },
  {
    id: 4,
    stem: '冬天穿羽絨外套會感覺溫暖，主要是因為？',
    knowledgeNodeId: 'INa-Ⅲ-8-06',
    options: [
      { tag: 'A', content: '羽絨外套會自己產生熱量。', diagnosis: 'M06-1' },
      { tag: 'B', content: '羽絨外套很重，壓力讓身體發熱。', diagnosis: 'M06-4' },
      { tag: 'C', content: '羽絨中的空氣層能減少體熱散失。', diagnosis: 'CORRECT' },
      { tag: 'D', content: '羽絨外套能把外面的冷空氣吸收掉。', diagnosis: 'M06-2' },
    ],
  },
  {
    id: 5,
    stem: '散熱片通常設計成有很多鰭片（fin），主要目的是？',
    knowledgeNodeId: 'Na-Ⅲ-8-07',
    options: [
      { tag: 'A', content: '增加接觸空氣的表面積，加速散熱。', diagnosis: 'CORRECT' },
      { tag: 'B', content: '鰭片會產生冷風來降溫。', diagnosis: 'M07-1' },
      { tag: 'C', content: '鰭片能阻擋熱輻射向外傳播。', diagnosis: 'M07-4' },
      { tag: 'D', content: '增加重量讓熱量更快沉到底部。', diagnosis: 'M07-3' },
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
const ANSWER_DISTRIBUTIONS_MAP = {
  // ── quiz-001 × class-A（20 人）──
  'quiz-001__class-A': [
    ['A','A','A','A','A','A','B','B','B','B','B','B','B','B','C','C','C','C','D','D'],
    ['A','A','A','A','A','A','A','B','B','B','B','B','B','B','C','C','C','C','D','D'],
    ['A','A','A','A','A','A','A','A','A','B','B','B','B','B','C','C','C','C','D','D'],
    ['A','A','A','B','B','B','B','B','B','C','C','C','C','D','D','D','D','D','D','D'],
    ['A','A','A','A','B','B','B','B','B','B','B','B','B','B','C','C','C','C','D','D'],
  ],
  // ── quiz-001 × class-B（18 人）──
  'quiz-001__class-B': [
    ['A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','D','D','D'],
    ['A','A','A','A','A','A','B','B','B','B','B','C','C','C','C','C','D','D'],
    ['A','A','A','A','A','A','A','A','B','B','B','B','C','C','C','C','D','D'],
    ['A','A','A','A','B','B','B','B','B','C','C','C','D','D','D','D','D','D'],
    ['A','A','A','B','B','B','B','B','B','B','B','B','C','C','C','C','D','D'],
  ],
  // ── quiz-001 × class-C（22 人）──
  'quiz-001__class-C': [
    ['A','A','A','A','A','A','A','A','B','B','B','B','B','C','C','C','C','C','D','D','D','D'],
    ['A','A','A','A','A','A','A','A','A','B','B','B','B','C','C','C','C','C','D','D','D','D'],
    ['A','A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','C','D','D','D','D'],
    ['A','A','A','A','A','B','B','B','B','B','C','C','C','C','D','D','D','D','D','D','D','D'],
    ['A','A','A','A','A','B','B','B','B','B','B','B','B','C','C','C','C','C','D','D','D','D'],
  ],
  // ── quiz-002 × class-A（20 人）── 第二次施測，掌握率有改善
  'quiz-002__class-A': [
    ['A','A','A','A','A','A','A','A','A','A','A','A','B','B','B','B','C','C','D','D'],
    ['A','A','A','A','A','A','A','A','A','A','B','B','B','C','C','C','C','D','D','D'],
    ['A','A','A','A','B','B','B','B','B','B','B','B','B','B','B','C','C','C','D','D'],
    ['A','A','A','B','B','B','C','C','C','C','C','C','C','C','C','C','D','D','D','D'],
    ['A','A','A','A','A','A','A','A','A','A','A','A','B','B','B','C','C','C','D','D'],
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
    title: '溫度與熱 · 迷思診斷（第一次）',
    status: 'published',
    questionCount: 5,
    knowledgeNodeIds: ['INa-Ⅲ-8-01', 'INa-Ⅲ-8-03', 'INa-Ⅲ-8-05', 'INa-Ⅲ-8-06', 'Na-Ⅲ-8-07'],
    questions: defaultQuestions,
    createdAt: '2024-03-01',
  },
  {
    id: 'quiz-002',
    title: '溫度與熱 · 迷思診斷（第二次）',
    status: 'published',
    questionCount: 5,
    knowledgeNodeIds: ['INa-Ⅲ-8-01', 'INa-Ⅲ-8-03', 'INa-Ⅲ-8-05', 'INa-Ⅲ-8-06', 'Na-Ⅲ-8-07'],
    questions: quiz002Questions,
    createdAt: '2024-03-20',
  },
];
