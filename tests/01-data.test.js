/* 科三路线通 · 数据完整性 + 集成测试 */
const fs = require('fs');
const { PROT, appSource } = require('./harness');
const path = PROT + '/';
let fail = 0;
const bad = m => { console.log('  !! ' + m); fail++; };

/* ---------- 环境桩 ---------- */
global.window = global;
let disk = {};
global.localStorage = {
  getItem: k => (k in disk ? disk[k] : null),
  setItem: (k, v) => { disk[k] = String(v); },
  removeItem: k => { delete disk[k]; }
};
const store = {};
const mkEl = () => ({ innerHTML: '', scrollTop: 0, style: {}, textContent: '',
                      classList: { add(){}, remove(){} } });
global.document = {
  getElementById: id => (store[id] || (store[id] = mkEl())),
  querySelectorAll: () => []
};

/* ---------- 加载数据层 ---------- */
for (const f of ['data/items.js', 'data/routes.js', 'data/special.js', 'data/lights.js'])
  new Function(fs.readFileSync(path + f, 'utf8'))();

const ITEMS = global.KC3_ITEMS, ROUTES = global.KC3_ROUTES,
      SPECIAL = global.KC3_SPECIAL, LIGHTS = global.KC3_LIGHTS, OPS = global.KC3_LIGHT_OPS;

/* ---------- A. 数据引用完整性 ---------- */
console.log('\nA) 数据引用完整性');
const SRC_OK = ['std', 'pub', 'map', 'inf'];
let refCount = 0;
for (const r of ROUTES) {
  r.seq.forEach((n, i) => {
    refCount++;
    if (!ITEMS[n.id]) bad(`${r.name} 第 ${i + 1} 项引用了不存在的项目 id: ${n.id}`);
    if (!SRC_OK.includes(n.src)) bad(`${r.name} 第 ${i + 1} 项 src 非法: ${n.src}`);
  });
}
console.log(`   ${refCount} 处节点引用全部指向已定义项目，src 取值合法`);

/* 反向：ITEMS 里有没有从未被任何线路引用的孤儿项 */
const used = new Set();
ROUTES.forEach(r => r.seq.forEach(n => used.add(n.id)));
const orphans = Object.keys(ITEMS).filter(k => !used.has(k));
if (orphans.length) bad('孤儿项目（定义了但没线路引用）: ' + orphans.join(', '));
else console.log('   无孤儿项目');

/* ---------- B. 要点库完整性 ---------- */
console.log('\nB) 16 项要点库');
const keys = Object.keys(ITEMS);
if (keys.length !== 16) bad(`ITEMS 应为 16 项，实际 ${keys.length}`);
for (const k of keys) {
  const it = ITEMS[k];
  for (const f of ['name', 'voice', 'key', 'tip', 'lose'])
    if (!it[f] || !String(it[f]).trim()) bad(`${k} 缺字段 ${f}`);
}
const c1only = keys.filter(k => ITEMS[k].c1);
if (c1only.length !== 1 || c1only[0] !== 'gear')
  bad('C1 专属项应只有 gear，实际: ' + c1only.join(','));
else console.log(`   ${keys.length} 项字段齐全；C1 专属项 = gear（加分减挡位操作）`);

/* ---------- C. 车型 × 线路 ---------- */
console.log('\nC) 车型 × 线路');
const filter = (r, model) => r.seq.filter(n => !(ITEMS[n.id].c1 && model === 'c2'));
const label = n => ITEMS[n.id].name + (n.tag ? '（' + n.tag + '）' : '');
for (const model of ['c1', 'c2']) {
  const want = model === 'c1' ? 16 : 15;
  const line = [];
  for (const r of ROUTES) {
    const list = filter(r, model);
    if (list.length !== want) bad(`${model} ${r.name} = ${list.length} 项（应 ${want}）`);
    const labels = list.map(label);
    if (new Set(labels).size !== labels.length)
      bad(`${model} ${r.name} 标签重复: ` + labels.filter((v, i) => labels.indexOf(v) !== i).join(','));
    line.push(r.name + '=' + list.length);
  }
  console.log(`   ${model.toUpperCase()} (应 ${want}): ` + line.join('  '));
}

/* ---------- D. 难点专项 ---------- */
console.log('\nD) 难点专项');
for (const m of ['c1', 'c2']) {
  for (const t of SPECIAL[m]) {
    if (t.type === 'choice') {
      if (!Array.isArray(t.opts) || t.opts.length < 2) bad(`${m}/${t.t} 选项异常`);
      if (typeof t.a !== 'number' || t.a < 0 || t.a >= t.opts.length) bad(`${m}/${t.t} 答案下标越界`);
      if (!t.q || !t.tip) bad(`${m}/${t.t} 缺题干或解析`);
    } else {
      if (!Array.isArray(t.steps) || t.steps.length < 3) bad(`${m}/${t.t} 步骤异常`);
      if (new Set(t.steps).size !== t.steps.length) bad(`${m}/${t.t} 步骤重复`);
      if (!t.tip) bad(`${m}/${t.t} 缺解析`);
    }
  }
  const o = SPECIAL[m].filter(x => x.type === 'order').length;
  console.log(`   ${m.toUpperCase()}: ${SPECIAL[m].length} 个（排序 ${o} / 单选 ${SPECIAL[m].length - o}）`);
}

/* ---------- E. 灯光题库 ---------- */
console.log('\nE) 灯光题库');
if (LIGHTS.length !== 12) bad(`灯光题应为 12 组，实际 ${LIGHTS.length}`);
LIGHTS.forEach((q, i) => {
  if (!q[0] || !q[1] || !q[2]) bad(`灯光第 ${i + 1} 题字段缺失`);
  if (!OPS.includes(q[1])) bad(`灯光第 ${i + 1} 题答案「${q[1]}」不在选项列表中`);
});
const ansSet = new Set(LIGHTS.map(q => q[1]));
console.log(`   12 组，答案全部落在 ${OPS.length} 个合法选项内；覆盖 ${ansSet.size} 种操作`);

/* ---------- F. 加载外壳并跑全页面 ---------- */
console.log('\nF) 全页面渲染（含速查展开态）');
let api;
try {
  api = new Function(appSource() +
    '; return {S,render,ROUTES,SPECIAL,routeItems,routeItemsFor,ITEMS};')();
  console.log('   外壳初始化 OK');
} catch (e) { bad('外壳初始化抛错: ' + e.message); }

if (api) {
  for (const m of ['c1', 'c2']) {
    api.S.model = m;
    for (const sc of ['home', 'scan', 'mine', 'special']) { api.S.screen = sc; api.render(); }
    /* 速查：每一项都展开一次 */
    for (let ri = 0; ri < api.ROUTES.length; ri++) {
      api.S.r = ri; api.S.screen = 'scan';
      for (let i = 0; i < api.routeItems(api.ROUTES[ri]).length; i++) { api.S.open = i; api.render(); }
      api.S.open = null;
    }
    for (let i = 0; i < api.SPECIAL[m].length; i++) {
      api.S.sp = i; api.S.sq = null; api.S.screen = 'sq'; api.render();
      const t = api.SPECIAL[m][i];
      if (t.type === 'order') { api.S.sq.ans = t.steps.map((_, k) => k); api.S.sq.judged = true; }
      else { api.S.sq.picked = t.a; }
      api.render();
    }
  }
  /* 排序题：全对 + 全错 */
  for (const m of ['c1', 'c2']) {
    api.S.model = m;
    for (let ri = 0; ri < api.ROUTES.length; ri++) {
      api.S.r = ri; api.S.Q = null; api.S.screen = 'order'; api.render();
      api.S.Q.ans = api.S.Q.correct.slice(); api.S.Q.judged = true; api.render();
      api.S.Q = null; api.render();
      api.S.Q.ans = api.S.Q.correct.slice().reverse(); api.S.Q.judged = true; api.render();
    }
  }
  api.S.model = 'c1'; api.S.screen = 'lights'; api.S.L = null; api.render();
  for (let i = 0; i < 6; i++) {
    api.render();
    if (api.S.L.i < 5) { api.S.L.log[api.S.L.i] = { o: '近光灯' }; api.S.L.ok++; api.S.L.i++; }
  }
  console.log('   两车型 × 全页面 × 速查逐项展开 × 专项正误 × 排序全对全错 × 灯光全流程 → 无异常');
}

/* ---------- G. 持久化 ---------- */
console.log('\nG) 持久化');
if (api) {
  const M = api.S.mistakes;
  M.unshift({ k:'light', model:'', scene:'雾天行驶', n:1,
              opts:['雾灯 + 双闪','近光灯','远光灯','关闭所有灯光'], ans:0 });
  api.S.model = 'c2';
  api.S.screen = 'home'; api.render();
  const saved = JSON.parse(disk['kc3.v1'] || '{}');
  if (saved.model !== 'c2') bad('model 未持久化');
  if (!saved.mistakes || !saved.mistakes.length) bad('mistakes 未持久化');
  else if (saved.mistakes[0].k !== 'light') bad('错题未按结构化格式写入');
  else console.log('   写入 → ' + JSON.stringify(saved).slice(0, 60) + '…');

  /* 冷启动读回：新起一个运行时，读同一份存储 */
  const back = new Function(appSource() + '; return {S};')();
  if (back.S.model !== 'c2') bad('重启后车型未恢复');
  if (back.S.mistakes.length !== 1) bad('重启后错题未恢复');
  else console.log('   重启恢复 → 车型 ' + back.S.model + ' · 错题 ' + back.S.mistakes.length + ' 条');
}

console.log(fail ? `\n=> FAIL ${fail} 项` : '\n=> 全部通过 ✓');
process.exit(fail ? 1 : 0);
