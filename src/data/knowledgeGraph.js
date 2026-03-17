export const knowledgeNodes = [
  {
    id: 'INa-Ⅲ-8-01',
    name: '熱傳導',
    description: '熱透過固體從溫度高傳至溫度低的地方',
    level: 1,
    prerequisites: [],
    misconceptions: [
      { id: 'M01-1', label: '不同材質在同環境下溫度不同', detail: '認為鐵椅本身溫度比木椅低，而非傳熱速率不同' },
      { id: 'M01-2', label: '冷是一種可傳播的能量', detail: '認為「冷」會像熱一樣從物體流向手部' },
      { id: 'M01-3', label: '金屬會產生冷氣', detail: '認為金屬材質本身能主動製造冷的感覺' },
      { id: 'M01-4', label: '熱只會向上傳導', detail: '混淆傳導方向與對流方向，認為熱只往上走' },
    ],
    teachingStrategy: '讓學生用溫度計同時測量公園鐵椅與木椅的表面溫度，觀察兩者溫度相同，引導學生理解觸感差異來自熱傳導速率而非溫度差。',
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
      { id: 'M03-1', label: '冷熱空氣流向混淆', detail: '認為冷空氣密度小會上升，熱空氣下沉' },
      { id: 'M03-2', label: '空氣流動受牆壁主導而非溫度', detail: '忽略溫差驅動，認為空氣沿牆壁水平移動' },
      { id: 'M03-3', label: '忽略流體對流性質', detail: '認為氣體不流動、停留在原處直到溫度改變' },
    ],
    teachingStrategy: '冷氣安裝在上方示範：用線香的煙霧觀察冷氣出風口附近的氣流，引導學生理解冷空氣密度大下沉、帶動室內對流循環。',
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
      { id: 'M05-1', label: '遮蔽物能主動製冷', detail: '認為傘或遮陽板會主動釋放冷氣，而非只是阻擋輻射' },
      { id: 'M05-2', label: '深淺色熱吸收概念混淆', detail: '認為淺色傘會吸收所有熱輻射，混淆吸收與反射' },
      { id: 'M05-3', label: '透明物體不能阻擋熱輻射', detail: '認為只有不透明物體才能阻擋，忽略材質的差異' },
      { id: 'M05-4', label: '誤用對流原理解釋輻射現象', detail: '用「傘下沒有對流」解釋傘下較涼的原因' },
    ],
    teachingStrategy: '比較深色與淺色布料覆蓋同一支溫度計在陽光下的溫度變化，引導學生理解顏色影響熱輻射吸收率。',
  },
  {
    id: 'INa-Ⅲ-8-06',
    name: '阻隔與保溫',
    description: '阻隔或減緩熱的傳播能保持物品溫度',
    level: 3,
    prerequisites: ['INa-Ⅲ-8-05'],
    misconceptions: [
      { id: 'M06-1', label: '保溫杯會主動產生熱能', detail: '認為保溫杯有加熱功能，混淆保溫與產熱' },
      { id: 'M06-2', label: '保溫是封存冷氣', detail: '認為冷氣被鎖在杯內，不理解熱傳遞的方向性' },
      { id: 'M06-3', label: '真空層沒有任何作用', detail: '不理解真空能同時阻斷傳導與對流兩種傳熱方式' },
      { id: 'M06-4', label: '生活經驗干擾保溫原理', detail: '如認為真空夾層是為了減輕重量而非隔熱' },
    ],
    teachingStrategy: '用真空保溫杯與普通杯子裝同溫熱水，間隔30分鐘測量溫度，讓學生親身比較保溫效果，討論真空層如何阻止熱傳導和對流。',
  },
  {
    id: 'Na-Ⅲ-8-07',
    name: '加快散熱',
    description: '加快熱傳播速度能使物品散熱',
    level: 3,
    prerequisites: ['INa-Ⅲ-8-05'],
    misconceptions: [
      { id: 'M07-1', label: '風扇會產生冷風', detail: '認為風扇像冷氣機一樣主動製造冷空氣' },
      { id: 'M07-2', label: '散熱片是吸收而非排放熱量', detail: '誤解散熱方向，認為散熱片把熱吸進去儲存' },
      { id: 'M07-3', label: '散熱風扇只是為了換新鮮空氣', detail: '以換氣功能解釋散熱，忽略對流加速散熱的機制' },
      { id: 'M07-4', label: '誤用熱輻射解釋風扇散熱', detail: '認為電腦風扇是用輻射方式散熱，而非加速對流' },
    ],
    teachingStrategy: '用熱成像或溫度計觀察電腦主機在風扇開/關兩種情況下的溫度變化，引導學生理解加速對流才是散熱原理。',
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
