/**
 * 追問 prompt 行為實測 harness（一次性，非正式程式）
 *
 * 用「真實的 buildFollowUpSystemPrompt」+「真實後端 /api/llm/chat」跑模擬國小學生回合，
 * 重現 followUpLlm.js 的訊息組裝（system + conversationLog + 狀態交接 + user）。
 * 觀察三點：①短句後是否用錨定式 why ②敷衍時逃生口不卡死 ③有自述才收尾。
 *
 * 用法：node scripts/followup_sim.mjs
 * 需求：docker 後端在 :8000、OpenAI 金鑰已掛載。
 */
import { buildFollowUpSystemPrompt, listSupportedNodes } from '../src/pages/student/followUp/followUpPrompts.js';

const BASE = 'http://localhost:8000';
const MAX_ROUNDS = 4;
const ACCOUNT = '115001'; // 種子學生，預設密碼=帳號

/* ---- 登入拿 cookie ---- */
async function login() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: ACCOUNT, password: ACCOUNT }),
  });
  if (!r.ok) throw new Error(`login failed ${r.status}: ${await r.text()}`);
  const setCookie = r.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('no cookie from login');
  return cookie;
}

/* ---- 容錯 JSON 抽取（簡化版，對齊 followUpLlm.extractJsonObject 精神）---- */
function parseJson(text) {
  if (!text) return null;
  const t = text.trim();
  try { return JSON.parse(t); } catch { /* */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch { /* */ } }
  const s = t.indexOf('{'); const e = t.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch { /* */ } }
  return null;
}

/* ---- 組 messages（忠實複製 followUpLlm.buildMessages）---- */
function buildMessages(systemPrompt, log, userMessage, prevRound, prevPhase) {
  const msgs = [{ role: 'system', content: systemPrompt }];
  for (const m of log) {
    if (!m?.content) continue;
    msgs.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content });
  }
  const nextRound = Math.min(prevRound + 1, MAX_ROUNDS);
  msgs.push({
    role: 'system',
    content:
      '【對話狀態交接】\n'
      + `上一輪 phase=${prevPhase}, round=${prevRound}\n`
      + `本輪 round=${nextRound}\n`
      + (nextRound >= MAX_ROUNDS
        ? '本輪是最後一輪，phase 必須=final，必須輸出完整 finalDiagnosis。'
        : '依 belief → challenge → cause → final 順序推進；不可跳階段。'),
  });
  msgs.push({ role: 'user', content: userMessage });
  return msgs;
}

async function callLlm(cookie, messages) {
  const r = await fetch(`${BASE}/api/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      messages, temperature: 0.4, maxTokens: 700, responseFormat: 'json_object',
    }),
  });
  if (!r.ok) throw new Error(`chat failed ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.content ?? '';
}

/* ---- 跑一個情境 ---- */
async function runScenario(cookie, label, { node, misconceptionId, isCorrect, opener, replies }) {
  console.log(`\n${'='.repeat(70)}\n情境：${label}\n節點：${node.id}  迷思：${misconceptionId ?? '(答對)'}\n${'='.repeat(70)}`);
  const systemPrompt = buildFollowUpSystemPrompt({
    knowledgeNode: node, misconceptionId, isCorrect,
    questionStem: '把方糖放進溫水裡並攪拌，過一陣子後方糖看不見了。下列敘述何者正確？',
    selectedOptionContent: '糖溶化消失，所以水裡沒有糖了',
  });
  console.log(`\n[AI 開場 belief/round1] ${opener}`);
  const log = [{ role: 'ai', content: opener }];
  let prevRound = 1; let prevPhase = 'belief';

  for (let i = 0; i < replies.length; i += 1) {
    const reply = replies[i];
    console.log(`\n  👦 學生：${reply}`);
    const msgs = buildMessages(systemPrompt, log, reply, prevRound, prevPhase);
    const raw = await callLlm(cookie, msgs);
    const obj = parseJson(raw);
    if (!obj) { console.log(`  ⚠️ 無法解析 LLM 回應：${raw.slice(0, 300)}`); break; }
    const chips = Array.isArray(obj.chips) ? `  [chips: ${obj.chips.join(' / ')}]` : '';
    console.log(`  🤖 AI [${obj.phase}/r${obj.round}]：${obj.assistantMessage}${chips}`);
    log.push({ role: 'student', content: reply });
    log.push({ role: 'ai', content: obj.assistantMessage });
    if (obj.finalDiagnosis) {
      const fd = obj.finalDiagnosis;
      console.log(`  🏁 FINAL → status=${fd.finalStatus} quality=${fd.reasoningQuality} causeIds=${JSON.stringify(fd.causeIds)} change=${fd.statusChange?.changeType}`);
      return;
    }
    prevRound = obj.round; prevPhase = obj.phase;
  }
  console.log('  （回合用盡仍未 final）');
}

async function fetchNodes(cookie) {
  const r = await fetch(`${BASE}/api/knowledge-nodes`, { headers: { Cookie: cookie } });
  if (!r.ok) throw new Error(`knowledge-nodes failed ${r.status}: ${await r.text()}`);
  return r.json();
}

async function main() {
  const cookie = await login();
  console.log('登入成功，cookie 取得。');
  const apiNodes = await fetchNodes(cookie);
  const supported = new Set(listSupportedNodes());
  // 挑一個「後端有資料 ∩ 有 NODE_CONTEXT prompt」且偏好 3-02 的節點
  const candidates = apiNodes.filter((n) => supported.has(n.id));
  if (!candidates.length) {
    throw new Error(`無共同節點。後端 ids=${apiNodes.map((n) => n.id).join(',')}；支援=${[...supported].join(',')}`);
  }
  const node = candidates.find((n) => n.id.includes('3-02')) ?? candidates[0];
  console.log(`使用節點：${node.id}（${node.name ?? ''}）`);
  const miscId = node.misconceptions?.[0]?.id ?? null;
  const opener = '我們來聊聊剛剛那題～你覺得方糖在水裡看不見了，是發生了什麼事呢？';

  // 情境 A：學生會給出有內容的短句 → 測 ① 錨定式 why、③ 有自述才收尾
  await runScenario(cookie, 'A 學生願意講（測①錨定why、③自述後收尾）', {
    node, misconceptionId: miscId, isCorrect: false, opener,
    replies: [
      '不見了',
      '糖溶化掉就消失了，因為我看不到它了',
      '對啊，攪一攪糖就會不見變成水',
      '我覺得糖真的消失了，水只是變甜',
    ],
  });

  // 情境 B：學生全程敷衍 → 測 ② 逃生口不卡死
  await runScenario(cookie, 'B 學生全程敷衍（測②逃生口/不卡死）', {
    node, misconceptionId: miscId, isCorrect: false, opener,
    replies: ['不知道', '不知道', '不想玩了', '不知道啦'],
  });

  // 情境 C：學生先敷衍後給一句自述 → 測 ③（自述出現後是否合理收尾）
  await runScenario(cookie, 'C 先敷衍後給自述（測③）', {
    node, misconceptionId: miscId, isCorrect: false, opener,
    replies: ['忘記了', '糖太小了所以看不到，但它還在水裡', '嗯就是這樣'],
  });
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
