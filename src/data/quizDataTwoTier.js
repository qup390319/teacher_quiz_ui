/**
 * 雙層次（two-tier）示範題組 — quiz-003 / quiz-004。
 *
 * 結構（對應 src/data/twoTier.js）：
 *   { id, stem, knowledgeNodeId, mode:'two-tier',
 *     answerOptions: [{ tag, content, correct }],         // 第一層：選答案
 *     reasonOptions: [{ tag, content, diagnosis }] }      // 第二層：選理由
 *
 * 涵蓋與 quiz-001/002 相同的 5 個節點：
 *   INe-Ⅱ-3-02、INe-Ⅱ-3-03、INe-Ⅱ-3-05、INe-Ⅲ-5-4、INe-Ⅲ-5-7
 *
 * 理由層選項參考鄭一亭（2003）《國小學童對水溶液的迷思概念類型與成因之研究》
 *（碩士論文，臺北市立師範學院）所整理之水溶液迷思概念類型編製。
 * 答案層 tag 用 A/B/C；理由層 tag 用 甲/乙/丙，避免學生混淆所在層級。
 */

// ═══ 題組三：水溶液 · 雙層次診斷（示範）═════════════════════════════════════
export const quiz003Questions = [
  {
    id: 1,
    mode: 'two-tier',
    stem: '把糖加進水裡攪一攪，糖看不見了，但水變甜了。下面哪個說法對？',
    knowledgeNodeId: 'INe-Ⅱ-3-02',
    answerOptions: [
      { tag: 'A', content: '糖已經消失不見了', correct: false },
      { tag: 'B', content: '糖還在水裡，只是看不到', correct: true },
      { tag: 'C', content: '糖跑到空氣中了', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為糖變成很小很小的粒子，分散在水裡', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為糖溶解之後就真的不存在了', diagnosis: 'M02-1' },
      { tag: '丙', content: '因為糖和水結合，變成了另一種新東西', diagnosis: 'M02-2' },
    ],
  },
  {
    id: 2,
    mode: 'two-tier',
    stem: '一杯水裡加了很多糖，攪很久之後杯底還是有糖沒溶。下面哪個說法對？',
    knowledgeNodeId: 'INe-Ⅱ-3-03',
    answerOptions: [
      { tag: 'A', content: '再多攪一定能把杯底的糖全部溶完', correct: false },
      { tag: 'B', content: '這杯水能溶的糖有上限，攪拌只能讓它溶得比較快', correct: true },
      { tag: 'C', content: '不攪拌的話糖根本不會溶', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為攪拌只會加快溶解速度，不會讓水裝下更多糖', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為只要一直攪，糖最後一定都能溶進去', diagnosis: 'M03-1' },
      { tag: '丙', content: '因為糖一定要攪拌才會溶解', diagnosis: 'M03-2' },
    ],
  },
  {
    id: 3,
    mode: 'two-tier',
    stem: '把鹽一直加進一杯水中，加到後來杯底有鹽溶不掉了。下面哪個說法對？',
    knowledgeNodeId: 'INe-Ⅱ-3-05',
    answerOptions: [
      { tag: 'A', content: '一杯水能溶的鹽有限，太多就溶不下了', correct: true },
      { tag: 'B', content: '鹽沉到杯底只是因為鹽比較重', correct: false },
      { tag: 'C', content: '只要持續加熱攪拌，水一定能把鹽全部溶光', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為水能溶的鹽到了上限（飽和），多的就會沉在杯底', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為鹽沉下去跟溶不下無關，只是重量問題', diagnosis: 'M05-2' },
      { tag: '丙', content: '因為水可以一直溶鹽，不可能有溶不下的時候', diagnosis: 'M05-3' },
    ],
  },
  {
    id: 4,
    mode: 'two-tier',
    stem: '老師給你一杯透明的水，要你分辨它是酸性、中性還是鹼性。下面哪個方法對？',
    knowledgeNodeId: 'INe-Ⅲ-5-4',
    answerOptions: [
      { tag: 'A', content: '用嘴巴嚐嚐看味道', correct: false },
      { tag: 'B', content: '用石蕊試紙放進去看顏色變化', correct: true },
      { tag: 'C', content: '用鼻子聞聞看有沒有味道', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為石蕊試紙碰到酸鹼會變色，是安全又準確的方法', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為嚐起來酸酸的就是酸性，用嚐的最準', diagnosis: 'M09-4' },
      { tag: '丙', content: '因為有沒有刺鼻味道就能分出酸鹼', diagnosis: 'M09-2' },
    ],
  },
  {
    id: 5,
    mode: 'two-tier',
    stem: '肥皂水是鹼性的，可以用來洗掉碗盤上的油漬。下面哪個說法對？',
    knowledgeNodeId: 'INe-Ⅲ-5-7',
    answerOptions: [
      { tag: 'A', content: '鹼性的東西都很危險，不能用在生活中', correct: false },
      { tag: 'B', content: '鹼性的肥皂水可以幫忙分解油漬把碗洗乾淨', correct: true },
      { tag: 'C', content: '酸和鹼碰在一起會互相消滅，什麼都不剩', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為鹼性能分解油脂，所以拿來去油污很有用', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為鹼性的東西都很危險、會傷人', diagnosis: 'M12-1' },
      { tag: '丙', content: '因為酸鹼中和後東西就完全消失了', diagnosis: 'M12-3' },
    ],
  },
];

// ═══ 題組四：水溶液 · 雙層次診斷（示範·第二份）═══════════════════════════════
export const quiz004Questions = [
  {
    id: 1,
    mode: 'two-tier',
    stem: '把鹽放進水裡攪一攪，鹽看不見了，但水變鹹了。下面哪個說法對？',
    knowledgeNodeId: 'INe-Ⅱ-3-02',
    answerOptions: [
      { tag: 'A', content: '鹽已經消失不見了', correct: false },
      { tag: 'B', content: '鹽變成很小的粒子散在水裡', correct: true },
      { tag: 'C', content: '鹽跑到空氣裡了', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為鹽變成很小的粒子分散在水中，所以水是鹹的', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為鹽溶掉就真的不見了，鹹味是水本來就有的', diagnosis: 'M02-1' },
      { tag: '丙', content: '因為鹽已經變成另一種東西了', diagnosis: 'M02-4' },
    ],
  },
  {
    id: 2,
    mode: 'two-tier',
    stem: '兩杯一樣多的水各加一樣多的糖，A 杯不攪、B 杯快速攪拌。下面哪個說法對？',
    knowledgeNodeId: 'INe-Ⅱ-3-03',
    answerOptions: [
      { tag: 'A', content: '最後兩杯溶的糖一樣多，只是 B 杯比較快溶完', correct: true },
      { tag: 'B', content: 'B 杯可以溶比較多糖', correct: false },
      { tag: 'C', content: 'A 杯的糖完全不會溶解', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為攪拌只影響溶解快慢，不影響能溶的總量', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為攪拌會讓水裝下更多糖', diagnosis: 'M03-1' },
      { tag: '丙', content: '因為沒攪拌糖就不會溶', diagnosis: 'M03-2' },
    ],
  },
  {
    id: 3,
    mode: 'two-tier',
    stem: '在一杯水中一直加糖並攪拌，加到水溶不下為止。你會看到什麼？',
    knowledgeNodeId: 'INe-Ⅱ-3-05',
    answerOptions: [
      { tag: 'A', content: '多出來的糖會沉在杯底，因為這杯水已經溶不下了', correct: true },
      { tag: 'B', content: '糖沉杯底只是太重，再多攪就會溶', correct: false },
      { tag: 'C', content: '水可以一直溶糖，不可能溶不下', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為水到達溶解上限（飽和）後就無法再溶更多', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為沉下去只是重量問題，跟溶不下無關', diagnosis: 'M05-2' },
      { tag: '丙', content: '因為水的溶解量沒有上限', diagnosis: 'M05-3' },
    ],
  },
  {
    id: 4,
    mode: 'two-tier',
    stem: '把紫色石蕊試紙放進小蘇打水裡，試紙變成藍色。這表示小蘇打水是什麼性質？',
    knowledgeNodeId: 'INe-Ⅲ-5-4',
    answerOptions: [
      { tag: 'A', content: '酸性', correct: false },
      { tag: 'B', content: '鹼性', correct: true },
      { tag: 'C', content: '中性', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為石蕊試紙碰到鹼性液體會變藍色', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為名字裡沒有「酸」字就不是酸性', diagnosis: 'M09-3' },
      { tag: '丙', content: '因為小蘇打水沒有特別味道所以是中性', diagnosis: 'M09-2' },
    ],
  },
  {
    id: 5,
    mode: 'two-tier',
    stem: '被蜜蜂叮到時皮膚又痛又癢，因為蜜蜂的毒液是酸性的。怎樣做比較好？',
    knowledgeNodeId: 'INe-Ⅲ-5-7',
    answerOptions: [
      { tag: 'A', content: '酸性的東西都很危險，千萬不能碰', correct: false },
      { tag: 'B', content: '塗一點鹼性的小蘇打水幫忙止癢', correct: true },
      { tag: 'C', content: '趕快塗檸檬汁，因為酸加酸可以消除', correct: false },
    ],
    reasonOptions: [
      { tag: '甲', content: '因為鹼性可以中和酸性的毒液，緩解不適', diagnosis: 'CORRECT' },
      { tag: '乙', content: '因為酸性的東西碰到一定會受傷', diagnosis: 'M12-1' },
      { tag: '丙', content: '因為再加酸可以把酸消掉', diagnosis: 'M12-3' },
    ],
  },
];
