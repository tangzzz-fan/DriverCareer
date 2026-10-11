/* 新功能回归：掌握度统计 / 首次引导 / 朗读降级 */
const fs = require('fs');
const { PROT, appSource } = require('./harness');
const P = PROT + '/';
let fail = 0;
const bad = m => { console.log('  !! ' + m); fail++; };

global.window = global;
let disk = {};
global.localStorage = {
  getItem: k => (k in disk ? disk[k] : null),
  setItem: (k, v) => { disk[k] = String(v); }, removeItem: k => { delete disk[k]; }
};
const store = {};
const mkEl = () => ({ innerHTML: '', scrollTop: 0, style: {}, textContent: '', classList: { add(){}, remove(){} } });
global.document = { getElementById: id => (store[id] || (store[id] = mkEl())), querySelectorAll: () => [] };

for (const f of ['data/items.js', 'data/routes.js', 'data/special.js', 'data/lights.js'])
  new Function(fs.readFileSync(P + f, 'utf8'))();

const app = new Function(appSource() +
  '; return {S,render,vHome,vMine,mastery,runCount,recordOrderResult,newQ,routeItems,ROUTES,CAN_SPEAK,buildMix,MIX_PER,MIX_WIN,segAt,buildScenario,SC_LEN,vScenario,vScenarioResult,newExam,vExam,examScores,EX_W,EX_LIGHT,EX_SC,EX_STAGES,scForRoute};')();
const html = () => store['app'].innerHTML;

/* ---------- H. 掌握度统计 ---------- */
console.log('\nH) 掌握度统计');
app.S.screen = 'home'; app.render();

// 第一次：全错
app.S.r = 0; app.S.Q = null; app.render();
app.S.screen = 'order'; app.render();
app.S.Q.ans = app.S.Q.correct.slice().reverse();
app.S.Q.judged = true; app.recordOrderResult();
const afterBad = app.mastery(app.ROUTES[0]);
console.log(`   全错一次 → 掌握度 ${afterBad}%  练过 ${app.runCount(app.ROUTES[0])} 次`);
if (afterBad !== 0) bad('全错时掌握度应为 0');

// 第二次：全对
app.S.Q = null; app.S.screen = 'order'; app.render();
app.S.Q.ans = app.S.Q.correct.slice();
app.S.Q.judged = true; app.recordOrderResult();
const afterGood = app.mastery(app.ROUTES[0]);
console.log(`   再全对一次 → 掌握度 ${afterGood}%  练过 ${app.runCount(app.ROUTES[0])} 次`);
if (afterGood !== 100) bad('全对时掌握度应为 100');
if (app.runCount(app.ROUTES[0]) !== 2) bad('练习次数应为 2');

// 第三次：只对一半 → 掌握度不应回退
app.S.Q = null; app.S.screen = 'order'; app.render();
const n = app.S.Q.correct.length;
app.S.Q.ans = app.S.Q.correct.slice();
for (let i = 0; i < n; i++) app.S.Q.ans[i] = (i % 2 === 0) ? i : (i + 1) % n;  // 打乱一半
app.S.Q.judged = true; app.recordOrderResult();
const afterMid = app.mastery(app.ROUTES[0]);
console.log(`   再考一次（有对有错） → 掌握度仍为 ${afterMid}%（取最好一次，不回退）`);
if (afterMid !== 100) bad('掌握度应保持历史最好值，不回退');
if (app.S.total !== 3) bad('总练习次数应为 3，实际 ' + app.S.total);
console.log(`   累计练习次数 = ${app.S.total}`);

/* ---------- I. 首次使用引导 ---------- */
console.log('\nI) 首次使用引导');
app.S.seen = false; app.S.screen = 'home'; app.render();
const showGuide = html().includes('第一次用');
if (!showGuide) bad('未读引导时首页应显示引导卡');
console.log('   seen=false → ' + (showGuide ? '显示引导卡 ✓' : '未显示 ✗'));
app.S.seen = true; app.render();
const hideGuide = !html().includes('第一次用');
if (!hideGuide) bad('已读引导后不应再显示');
console.log('   seen=true  → ' + (hideGuide ? '已隐藏 ✓' : '仍在显示 ✗'));

/* ---------- J. 掌握度在「我的」页渲染 ---------- */
console.log('\nJ) 「我的」页渲染');
app.S.screen = 'mine'; app.render();
const s = html();
for (const k of ['练习次数', '平均掌握度', '线路掌握度', '错题本']) if (!s.includes(k)) bad('缺「' + k + '」');
const shown = (s.match(/100%/g) || []).length;
console.log(`   统计卡片 + 掌握度条渲染正常；出现 100% 共 ${shown} 处`);

/* ---------- K. 朗读按钮的降级 ---------- */
console.log('\nK) 朗读降级（本环境无 speechSynthesis）');
if (app.CAN_SPEAK) bad('node 环境不应检测到 speechSynthesis');
app.S.screen = 'lights'; app.S.L = null; app.render();
const lightsHtml = html();
if (lightsHtml.includes('朗读播报')) bad('不支持语音时不应渲染朗读按钮');
console.log('   灯光页：' + (lightsHtml.includes('朗读播报') ? '出现按钮 ✗' : '未出现按钮 ✓（正确降级）'));
app.S.screen = 'scan'; app.S.r = 0; app.S.open = 1; app.render();
console.log('   速查页：' + (html().includes('data-say-id') ? '出现按钮 ✗' : '未出现按钮 ✓（正确降级）'));

/* ---------- L. 持久化带上新字段 ---------- */
console.log('\nL) 持久化字段');
app.S.screen = 'home'; app.render();
const saved = JSON.parse(disk['kc3.v1'] || '{}');
for (const k of ['model', 'mistakes', 'stats', 'total', 'seen']) if (!(k in saved)) bad('持久化缺字段 ' + k);
console.log('   ' + Object.keys(saved).join(' / '));

/* ---------- M. 跨线路混合 ---------- */
console.log('\nM) 跨线路混合 · 出题');
for (const model of ['c1', 'c2']) {
  app.S.model = model;
  const L = app.ROUTES.map(r => app.routeItems(r).map(x => x.label));
  let ambiguous = 0, rounds = 0, counts = [];
  for (let n = 0; n < 80; n++) {
    const qs = app.buildMix();
    rounds++;
    counts.push(qs.length);
    const per = {};
    for (const q of qs) {
      per[q.ri] = (per[q.ri] || 0) + 1;
      // 唯一性：这段不能在别的线路也按同序出现
      const k = q.seg.join('|');
      app.ROUTES.forEach((_, oi) => {
        if (oi === q.ri) return;
        const b = L[oi];
        for (let j = 0; j + app.MIX_WIN <= b.length; j++)
          if (b.slice(j, j + app.MIX_WIN).join('|') === k) ambiguous++;
      });
      if (q.ri < 0 || q.ri >= app.ROUTES.length) ambiguous++;
      if (q.from < 3) ambiguous++;
    }
    for (const k in per) if (per[k] > app.MIX_PER) ambiguous++;
  }
  const min = Math.min(...counts), max = Math.max(...counts);
  const covered = new Set();
  for (let n = 0; n < 40; n++) app.buildMix().forEach(q => covered.add(q.ri));
  console.log(`   ${model.toUpperCase()}  80 轮出题 ${min}–${max} 道（分层：每线 ≤${app.MIX_PER}）`);
  console.log(`   覆盖到的线路: ${covered.size}/4 ${covered.size === 4 ? '✓' : '✗'}`);
  console.log(`   歧义/越界检查: ${ambiguous ? '!! ' + ambiguous + ' 处' : '全部唯一、下标合法 ✓'}`);
  if (ambiguous) bad('存在歧义题');
  if (min < 4) bad('出题数过少');
  if (covered.size !== 4) bad('有线路未被覆盖');
}

/* ---------- N. 跨线路模式渲染 ---------- */
console.log('\nN) 跨线路混合 · 渲染');
app.S.model = 'c1'; app.S.mix = null; app.S.screen = 'mix'; app.render();
let h = html();
if (!h.includes('segcard')) bad('题目页未渲染片段卡');
if (!h.includes('data-mix')) bad('题目页未渲染选项');
// 逐题走完：交替选对/选错
for (let i = 0; i < app.S.mix.list.length; i++) {
  const q = app.S.mix.list[i];
  app.S.mix.log[i] = (i % 2 === 0) ? q.ri : (q.ri + 1) % app.ROUTES.length;
  if (app.S.mix.log[i] === q.ri) app.S.mix.ok++;
  app.S.mix.i = i; app.render();
  if (i === 0) {
    const hh = html();
    if (!hh.includes('expl')) bad('答后未显示反馈');
  }
}
app.S.mix.i = app.S.mix.list.length; app.render();
h = html();
if (!h.includes('跨线路混合 · 成绩')) bad('未渲染成绩页');
console.log(`   题目页 / 答后反馈 / 成绩页 渲染正常（本轮 ${app.S.mix.list.length} 题，答对 ${app.S.mix.ok}）`);

/* ---------- O. 情境判断 ---------- */
console.log('\nO) 情境判断 · 出题');
for (const model of ['c1', 'c2']) {
  app.S.model = model;
  const L = app.ROUTES.map(r => app.routeItems(r).map(x => x.label));
  let errs = 0, counts = [];
  for (let n = 0; n < 80; n++) {
    const qs = app.buildScenario();
    counts.push(qs.length);
    for (const q of qs) {
      if (!Array.isArray(q.opts) || q.opts.length !== 4) { errs++; continue; }
      if (q.ans < 0 || q.ans >= q.opts.length) errs++;
      if (new Set(q.opts).size !== q.opts.length) errs++;          // 选项重复
      const a = L[q.ri];
      const idx = a.indexOf(q.cue);
      if (idx < 3 || idx >= a.length - 1) errs++;                   // 位置不合法
      else if (q.opts[q.ans] !== a[idx + 1]) errs++;                // 答案不对应下一项
      if (q.opts.includes(q.cue)) errs++;                           // 干扰项不该含「当前项」
    }
  }
  const min = Math.min(...counts), max = Math.max(...counts);
  console.log(`   ${model.toUpperCase()}  80 轮出题 ${min}–${max} 道（目标 ${app.SC_LEN}）`);
  console.log(`   选项/答案/位置校验: ${errs ? '!! ' + errs + ' 处' : '答案均为「下一项」、四选项无重复 ✓'}`);
  if (errs) bad('情境题存在错误');
  if (min < 6) bad('情境题数量过少');
}

/* ---------- P. 情境判断 · 渲染 ---------- */
console.log('\nP) 情境判断 · 渲染');
app.S.model = 'c1'; app.S.sc = null; app.S.screen = 'scenario'; app.render();
let h2 = html();
if (!h2.includes('cue')) bad('情境页未渲染播报卡');
if (!h2.includes('data-sc')) bad('情境页未渲染选项');
for (let i = 0; i < app.S.sc.list.length; i++) {
  const q = app.S.sc.list[i];
  app.S.sc.log[i] = (i % 3 === 0) ? (q.ans + 1) % 4 : q.ans;
  if (app.S.sc.log[i] === q.ans) app.S.sc.ok++;
  app.S.sc.i = i; app.render();
}
app.S.sc.i = app.S.sc.list.length; app.render();
if (!html().includes('情境判断 · 成绩')) bad('未渲染情境成绩页');
console.log(`   播报卡 / 选项 / 答后反馈 / 成绩页 渲染正常（本轮 ${app.S.sc.list.length} 题，答对 ${app.S.sc.ok}）`);

/* ---------- Q. 整场模拟 ---------- */
console.log('\nQ) 整场模拟 · 结构与计分');
for (const model of ['c1', 'c2']) {
  app.S.model = model;
  let errs = 0, routesSeen = new Set();
  for (let n = 0; n < 60; n++) {
    const E = app.newExam();
    routesSeen.add(E.ri);
    if (E.phase !== 0) errs++;
    if (E.light.set.length !== app.EX_LIGHT) errs++;
    if (E.sc.list.length !== app.EX_SC) errs++;
    if (E.sc.list.some(q => q.ri !== E.ri)) errs++;          // 情境题必须来自同一条线
    if (E.order !== null) errs++;
  }
  console.log(`   ${model.toUpperCase()}  60 次抽题：灯光 ${app.EX_LIGHT} 题 / 情境 ${app.EX_SC} 题，抽到 ${routesSeen.size}/4 条线路`);
  if (errs) bad('newExam 结构异常 ' + errs + ' 处');
  if (routesSeen.size !== 4) bad('随机抽线路未覆盖全部 4 条');
}

/* 计分边界 */
console.log('\nQ2) 计分边界');
const mk = (lOk, lN, oOk, oN, sOk, sN) => ({
  light:{ ok:lOk, set:new Array(lN).fill(0) },
  order:{ items:new Array(oN).fill(0), ans:Array.from({length:oN},(_,i)=> i<oOk ? i : (i+1)%Math.max(oN,1)) },
  sc:{ ok:sOk, list:new Array(sN).fill(0) }
});
const cases = [
  ['满分',     mk(5,5,16,16,4,4), 100],
  ['全错',     mk(0,5,0,16,0,4),   0],
  ['只错灯光', mk(4,5,16,16,4,4), 94],
  ['顺序对一半', mk(5,5,8,16,4,4), 80],   // 8/16 = 50% → 40×0.5 = 20；30+20+30 = 80
  ['顺序未提交', { light:{ok:5,set:new Array(5).fill(0)}, order:null, sc:{ok:4,list:new Array(4).fill(0)} }, 60],
  ['零题保护', { light:{ok:0,set:[]}, order:null, sc:{ok:0,list:[]} }, 0]
];
for (const [name, E, want] of cases) {
  const got = app.examScores(E);
  const total = got.light + got.order + got.sc;
  const ok = total === want;
  if (!ok) bad(`${name}: 期望 ${want} 实得 ${total}`);
  console.log(`   ${name.padEnd(6)} → 灯光 ${String(got.light).padStart(2)}/30  顺序 ${String(got.order).padStart(2)}/40  情境 ${String(got.sc).padStart(2)}/30  合计 ${total} ${ok?'✓':'✗'}`);
}
const wsum = app.EX_W.reduce((a,b)=>a+b,0);
if (wsum !== 100) bad('三段分值合计应为 100，实际 ' + wsum);

/* ---------- R. 整场模拟 · 全流程渲染 ---------- */
console.log('\nR) 整场模拟 · 走完整流程');
app.S.model = 'c1'; app.S.exam = null; app.S.screen = 'exam'; app.render();
let he = html();
for (const k of ['1', '夜间灯光', 'exbar']) if (!he.includes(k)) bad('阶段1 渲染缺 ' + k);
for (let i = 0; i < app.EX_LIGHT; i++) {
  const q = app.S.exam.light.set[i];
  app.S.exam.light.log[i] = { o: q[1] }; app.S.exam.light.ok++;
  app.render();
}
app.S.exam.light.i = app.EX_LIGHT; app.S.exam.phase = 1; app.render();
if (!html().includes('路线顺序')) bad('未进入阶段2');
const ON = app.S.exam.order.items.length;
app.S.exam.order.ans = app.S.exam.order.items.map((_, i) => i);
app.render();
app.S.exam.order.judged = true; app.render();
app.S.exam.phase = 2; app.render();
if (!html().includes('情境')) bad('未进入阶段3');
for (let i = 0; i < app.S.exam.sc.list.length; i++) {
  const q = app.S.exam.sc.list[i];
  app.S.exam.sc.log[i] = q.ans; app.S.exam.sc.ok++;
  app.S.exam.sc.i = i; app.render();
}
app.S.exam.sc.i = app.S.exam.sc.list.length; app.S.exam.phase = 3; app.render();
he = html();
if (!he.includes('整场模拟 · 成绩')) bad('未进入成绩页');
const m = he.match(/class="big"[^>]*>(\d+)</);
console.log(`   三阶段全部走通；全对场景总分显示为 ${m ? m[1] : '?'}（应为 100）`);
if (!m || m[1] !== '100') bad('全对时总分不是 100');

console.log(fail ? `\n=> FAIL ${fail} 项` : '\n=> 全部通过 ✓');
process.exit(fail ? 1 : 0);
