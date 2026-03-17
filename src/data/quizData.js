// 5 題診斷題目（預設題組「溫度與熱」）
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

// 模擬 20 位學生作答數據
// 每位學生有 5 題的作答（儲存選項 tag: A/B/C/D）
const STUDENT_NAMES = [
  '王小明', '李美玲', '張志豪', '陳佳慧', '林俊傑',
  '黃雅婷', '吳建宏', '劉淑芬', '蔡宗翰', '鄭雨晴',
  '許文彬', '謝欣妤', '楊偉誠', '賴芷瑄', '蕭明哲',
  '周怡君', '江柏宇', '洪佩珊', '邱振源', '盧雅文',
];

// 每題選項分佈：模擬真實班級中的迷思分佈
const ANSWER_DISTRIBUTIONS = [
  // 題 1：B 正確。A=6人,B=8人,C=4人,D=2人
  ['A','A','A','A','A','A','B','B','B','B','B','B','B','B','C','C','C','C','D','D'],
  // 題 2：B 正確。A=7人,B=7人,C=4人,D=2人
  ['A','A','A','A','A','A','A','B','B','B','B','B','B','B','C','C','C','C','D','D'],
  // 題 3：A 正確。A=9人,B=5人,C=4人,D=2人
  ['A','A','A','A','A','A','A','A','A','B','B','B','B','B','C','C','C','C','D','D'],
  // 題 4：B 正確。A=3人,B=6人,C=4人,D=7人
  ['A','A','A','B','B','B','B','B','B','C','C','C','C','D','D','D','D','D','D','D'],
  // 題 5：B 正確。A=4人,B=10人,C=4人,D=2人
  ['A','A','A','A','B','B','B','B','B','B','B','B','B','B','C','C','C','C','D','D'],
];

export const classAnswers = STUDENT_NAMES.map((name, studentIndex) => ({
  studentId: studentIndex + 1,
  studentName: name,
  answers: defaultQuestions.map((q, qIndex) => ({
    questionId: q.id,
    selectedTag: ANSWER_DISTRIBUTIONS[qIndex][studentIndex],
  })),
}));

// 計算每題選擇各選項的人數
export const getQuestionStats = (questionIndex) => {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  ANSWER_DISTRIBUTIONS[questionIndex].forEach((tag) => counts[tag]++);
  return counts;
};

// 計算每個迷思被選擇的學生名單
export const getMisconceptionStudents = () => {
  const result = {}; // misconceptionId -> [studentNames]
  classAnswers.forEach(({ studentName, answers }) => {
    answers.forEach(({ questionId, selectedTag }) => {
      const question = defaultQuestions.find((q) => q.id === questionId);
      const option = question.options.find((o) => o.tag === selectedTag);
      if (option.diagnosis !== 'CORRECT') {
        if (!result[option.diagnosis]) result[option.diagnosis] = [];
        result[option.diagnosis].push(studentName);
      }
    });
  });
  return result;
};

// 考卷庫靜態資料
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
];

// 計算各知識節點通過率（選正確答案的人數 / 20）
export const getNodePassRates = () => {
  const nodeCorrect = {};
  classAnswers.forEach(({ answers }) => {
    answers.forEach(({ questionId, selectedTag }) => {
      const question = defaultQuestions.find((q) => q.id === questionId);
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
