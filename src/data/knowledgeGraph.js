export const knowledgeNodes = [
  {
    id: 'INa-Ⅲ-8-01',
    name: '熱傳導',
    description: '熱透過固體從溫度高傳至溫度低的地方',
    level: 1,
    prerequisites: [],
    misconceptions: [
      { id: 'M01-1', label: '不同材質在同環境下溫度不同', detail: '認為鐵椅本身溫度比木椅低，而非傳熱速率不同', studentDetail: '也就是說，你可能會覺得鐵椅本來就比木椅更冷。', confirmQuestion: '你是不是覺得，鐵椅本來就比木頭椅子更冷，所以摸起來才特別冰呢？' },
      { id: 'M01-2', label: '冷是一種可傳播的能量', detail: '認為「冷」會像熱一樣從物體流向手部', studentDetail: '也就是說，你可能會覺得「冷」也會跑來跑去，從鐵椅傳到手上。', confirmQuestion: '你是不是覺得，「冷」也會像熱一樣，從鐵椅傳到你的手上呢？' },
      { id: 'M01-3', label: '金屬會產生冷氣', detail: '認為金屬材質本身能主動製造冷的感覺', studentDetail: '也就是說，你可能會覺得金屬自己會放出冷冷的感覺。', confirmQuestion: '你是不是覺得，金屬本身會自己產生冷冷的感覺，所以摸起來特別冰呢？' },
      { id: 'M01-4', label: '熱只會向上傳導', detail: '混淆傳導方向與對流方向，認為熱只往上走', studentDetail: '也就是說，你可能會覺得熱只會往上走，不會往其他方向傳。', confirmQuestion: '你是不是覺得，熱在物體裡只會往上傳，不會往旁邊或往下傳呢？' },
    ],
    teachingStrategy: '讓學生用溫度計同時測量公園鐵椅與木椅的表面溫度，觀察兩者溫度相同，引導學生理解觸感差異來自熱傳導速率而非溫度差。',
    studentHint: '你知道嗎？鐵椅和木椅放在同一個地方時，溫度可能差不多，但鐵會更快把手上的熱帶走，所以摸起來比較冰。',
  },
  {
    id: 'INa-Ⅲ-8-02',
    name: '熱對流（液體）',
    description: '液體受溫度影響而產生升降運動',
    level: 1,
    prerequisites: [],
    misconceptions: [
      { id: 'M02-1', label: '液體加熱後體積不變', detail: '忽略熱脹冷縮，認為液體加熱後密度不變' },
      { id: 'M02-2', label: '熱水下沉冷水上升', detail: '流體密度與溫度的關係顛倒，認為熱水較重會下沉' },
      { id: 'M02-3', label: '液體中的熱只靠傳導傳遞', detail: '忽略對流機制，認為液體不會流動傳熱' },
    ],
    teachingStrategy: '使用食用色素滴入熱水/冷水中觀察對流流向，讓學生親眼看見熱水上升、冷水下沉的流動路徑。',
  },
  {
    id: 'INa-Ⅲ-8-03',
    name: '熱對流（氣體）',
    description: '氣體受溫度影響而產生升降運動',
    level: 1,
    prerequisites: [],
    misconceptions: [
      { id: 'M03-1', label: '冷熱空氣流向混淆', detail: '認為冷空氣密度小會上升，熱空氣下沉', studentDetail: '也就是說，你可能會覺得冷空氣比較輕，會往上跑。', confirmQuestion: '你是不是覺得，冷空氣比較輕，所以會往上升，而熱空氣會往下沉呢？' },
      { id: 'M03-2', label: '空氣流動受牆壁主導而非溫度', detail: '忽略溫差驅動，認為空氣沿牆壁水平移動', studentDetail: '也就是說，你可能會覺得空氣怎麼流，主要是被牆壁方向帶著走。', confirmQuestion: '你是不是覺得，空氣的流動方向主要是沿著牆壁走，跟冷熱變化沒有太大關係呢？' },
      { id: 'M03-3', label: '忽略流體對流性質', detail: '認為氣體不流動、停留在原處直到溫度改變', studentDetail: '也就是說，你可能會覺得空氣會先停在原地，不會自己流動。', confirmQuestion: '你是不是覺得，空氣會先停在原地，等到溫度改變後才會移動呢？' },
    ],
    teachingStrategy: '冷氣安裝在上方示範：用線香的煙霧觀察冷氣出風口附近的氣流，引導學生理解冷空氣密度大下沉、帶動室內對流循環。',
    studentHint: '你知道嗎？冷空氣比較重，會往下沉；熱空氣比較輕，會往上升，所以房間裡的空氣會一直流動。',
  },
  {
    id: 'INa-Ⅲ-8-04',
    name: '熱輻射原理',
    description: '不須其他物質（介質）就能傳熱',
    level: 2,
    prerequisites: ['INa-Ⅲ-8-01', 'INa-Ⅲ-8-02', 'INa-Ⅲ-8-03'],
    misconceptions: [
      { id: 'M04-1', label: '輻射一定需要空氣才能傳熱', detail: '與傳導/對流混淆，認為輻射也需要介質' },
      { id: 'M04-2', label: '只有太陽才會產生熱輻射', detail: '窄化輻射來源，認為日常物體不會輻射' },
      { id: 'M04-3', label: '熱輻射就是光線', detail: '將熱輻射等同於可見光，忽略紅外線等不可見輻射' },
    ],
    teachingStrategy: '在真空玻璃容器兩端放置溫度感測器，一端加熱，讓學生觀察到不需介質也能傳熱。對比太空中的太陽熱量如何到達地球。',
  },
  {
    id: 'INa-Ⅲ-8-05',
    name: '熱輻射阻擋',
    description: '熱輻射會受到物體阻擋而減弱',
    level: 2,
    prerequisites: ['INa-Ⅲ-8-04'],
    misconceptions: [
      { id: 'M05-1', label: '遮蔽物能主動製冷', detail: '認為傘或遮陽板會主動釋放冷氣，而非只是阻擋輻射', studentDetail: '也就是說，你可能會覺得傘子會主動放出涼涼的感覺。', confirmQuestion: '你是不是覺得，傘子本身會主動讓周圍變涼，而不只是幫你擋住太陽呢？' },
      { id: 'M05-2', label: '深淺色熱吸收概念混淆', detail: '認為淺色傘會吸收所有熱輻射，混淆吸收與反射', studentDetail: '也就是說，你可能會覺得淺色的傘把太陽的熱全部吸進去了。', confirmQuestion: '你是不是覺得，淺色的傘會把太陽的熱都吸進去，所以傘下才會有變化呢？' },
      { id: 'M05-3', label: '透明物體不能阻擋熱輻射', detail: '認為只有不透明物體才能阻擋，忽略材質的差異', studentDetail: '也就是說，你可能會覺得只要是透明的東西，就完全擋不住熱。', confirmQuestion: '你是不是覺得，只要東西是透明的，就完全沒有辦法幫忙擋住熱呢？' },
      { id: 'M05-4', label: '誤用對流原理解釋輻射現象', detail: '用「傘下沒有對流」解釋傘下較涼的原因', studentDetail: '也就是說，你可能會覺得傘下比較涼，是因為那裡的空氣不流動。', confirmQuestion: '你是不是覺得，傘下比較涼主要是因為傘下的空氣不太流動呢？' },
    ],
    teachingStrategy: '比較深色與淺色布料覆蓋同一支溫度計在陽光下的溫度變化，引導學生理解顏色影響熱輻射吸收率。',
    studentHint: '你知道嗎？傘子不會自己製造冷氣，它是幫你擋住一部分太陽帶來的熱，所以站在傘下會比較舒服。',
  },
  {
    id: 'INa-Ⅲ-8-06',
    name: '阻隔與保溫',
    description: '阻隔或減緩熱的傳播能保持物品溫度',
    level: 3,
    prerequisites: ['INa-Ⅲ-8-05'],
    misconceptions: [
      { id: 'M06-1', label: '保溫杯會主動產生熱能', detail: '認為保溫杯有加熱功能，混淆保溫與產熱', studentDetail: '也就是說，你可能會覺得保溫杯自己會產生熱，才讓水保持溫熱。', confirmQuestion: '你是不是覺得，保溫杯自己會產生熱，所以杯子裡的水才一直暖暖的呢？' },
      { id: 'M06-2', label: '保溫是封存冷氣', detail: '認為冷氣被鎖在杯內，不理解熱傳遞的方向性', studentDetail: '也就是說，你可能會覺得保溫杯是把冷冷的感覺鎖在裡面。', confirmQuestion: '你是不是覺得，保溫杯可以把冷冷的空氣或冷氣鎖在杯子裡面呢？' },
      { id: 'M06-3', label: '真空層沒有任何作用', detail: '不理解真空能同時阻斷傳導與對流兩種傳熱方式', studentDetail: '也就是說，你可能會覺得真空那一層有沒有都沒差。', confirmQuestion: '你是不是覺得，保溫杯中間的真空層其實沒有什麼特別作用呢？' },
      { id: 'M06-4', label: '生活經驗干擾保溫原理', detail: '如認為真空夾層是為了減輕重量而非隔熱', studentDetail: '也就是說，你可能會覺得真空夾層只是讓保溫杯變輕。', confirmQuestion: '你是不是覺得，保溫杯做成真空主要只是為了讓杯子比較輕呢？' },
    ],
    teachingStrategy: '用真空保溫杯與普通杯子裝同溫熱水，間隔30分鐘測量溫度，讓學生親身比較保溫效果，討論真空層如何阻止熱傳導和對流。',
    studentHint: '你知道嗎？保溫杯不會自己加熱，它是想辦法減少熱跑掉，所以裡面的水才能保持比較久的溫度。',
  },
  {
    id: 'Na-Ⅲ-8-07',
    name: '加快散熱',
    description: '加快熱傳播速度能使物品散熱',
    level: 3,
    prerequisites: ['INa-Ⅲ-8-05'],
    misconceptions: [
      { id: 'M07-1', label: '風扇會產生冷風', detail: '認為風扇像冷氣機一樣主動製造冷空氣', studentDetail: '也就是說，你可能會覺得風扇自己會製造冷風。', confirmQuestion: '你是不是覺得，風扇轉起來時會自己製造出冷風呢？' },
      { id: 'M07-2', label: '散熱片是吸收而非排放熱量', detail: '誤解散熱方向，認為散熱片把熱吸進去儲存', studentDetail: '也就是說，你可能會覺得散熱片是把熱收進去，不讓它跑出來。', confirmQuestion: '你是不是覺得，散熱片的工作是把熱吸進去存起來，而不是把熱帶走呢？' },
      { id: 'M07-3', label: '散熱風扇只是為了換新鮮空氣', detail: '以換氣功能解釋散熱，忽略對流加速散熱的機制', studentDetail: '也就是說，你可能會覺得風扇只是把外面的新鮮空氣吹進來。', confirmQuestion: '你是不是覺得，電腦後面的風扇主要只是把外面的新鮮空氣吹進去呢？' },
      { id: 'M07-4', label: '誤用熱輻射解釋風扇散熱', detail: '認為電腦風扇是用輻射方式散熱，而非加速對流', studentDetail: '也就是說，你可能會覺得風扇是靠熱自己往外散出去，不是靠空氣流動帶走熱。', confirmQuestion: '你是不是覺得，電腦風扇散熱主要不是靠空氣流動，而是靠熱自己往外散出去呢？' },
    ],
    teachingStrategy: '用熱成像或溫度計觀察電腦主機在風扇開/關兩種情況下的溫度變化，引導學生理解加速對流才是散熱原理。',
    studentHint: '你知道嗎？風扇不會製造冷氣，它是讓空氣流動更快，把熱帶走，所以電腦才比較不容易太熱。',
  },
  {
    id: 'INa-Ⅲ-8-08',
    name: '降溫節能設計',
    description: '綜合運用熱傳遞知識於建築物設計',
    level: 4,
    prerequisites: ['INa-Ⅲ-8-06', 'Na-Ⅲ-8-07'],
    misconceptions: [
      { id: 'M08-1', label: '白色牆面吸收熱量較多', detail: '深淺色反射/吸收混淆，認為白色吸熱多' },
      { id: 'M08-2', label: '通風只是為了空氣新鮮', detail: '忽略對流散熱功能，不理解通風設計的降溫目的' },
      { id: 'M08-3', label: '隔熱材料會讓室內更熱', detail: '誤解阻隔傳導的雙向效果，認為隔熱材料會悶住熱' },
    ],
    teachingStrategy: '比較不同顏色屋頂模型在燈光照射下的內部溫度，並討論騎樓、屋頂通風設計的散熱原理，讓學生設計最涼爽的建築方案。',
  },
];

export const getNodeById = (id) => knowledgeNodes.find((n) => n.id === id);

export const getMisconceptionById = (mid) => {
  for (const node of knowledgeNodes) {
    const m = node.misconceptions.find((m) => m.id === mid);
    if (m) return { ...m, nodeId: node.id, nodeName: node.name };
  }
  return null;
};
