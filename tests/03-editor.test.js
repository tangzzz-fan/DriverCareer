/* 校验 editor.html：导出的 routes.js 必须与编辑状态完全一致（往返一致性） */
const fs = require('fs');
const { PROT, appSource } = require('./harness');
const P = PROT + '/';
let fail = 0;
const bad = m => { console.log('  !! ' + m); fail++; };

/* ---- 环境 ---- */
global.window = global;
const fakeEl = () => ({
  innerHTML: '', value: '', style: {}, textContent: '',
  classList: { add(){}, remove(){} },
  onclick: null, onchange: null, click(){}, href: '', download: ''
});
global.document = {
  getElementById: () => fakeEl(),
  querySelectorAll: () => [],
  createElement: () => fakeEl()
};
global.confirm = () => false;
global.Blob = function(){};
/* 不要覆盖 URL 本身：Node 的 fs 内部依赖 `x instanceof URL`，
   direct 赋值成普通对象会让 filePath instanceof URL 抛 "not callable" */
if (typeof URL.createObjectURL !== 'function') URL.createObjectURL = () => 'blob:x';
if (typeof URL.revokeObjectURL !== 'function') URL.revokeObjectURL = () => {};

/* ---- 载入真实数据 ---- */
for (const f of ['data/items.js', 'data/routes.js', 'data/special.js', 'data/lights.js'])
  new Function(fs.readFileSync(P + f, 'utf8'))();
const ORIG = JSON.parse(JSON.stringify(global.KC3_ROUTES));

/* ---- 载入编辑器脚本 ---- */
const html = fs.readFileSync(P + 'editor.html', 'utf8');
const m = html.match(/<script>\n([\s\S]*?)<\/script>/);
if (!m) { console.log('!! 未找到编辑器脚本'); process.exit(1); }

let ed;
try {
  ed = new Function(m[1] + '; return {buildSource, R};')();
  console.log('1) 编辑器脚本可加载执行 ✓');
} catch (e) {
  console.log('!! 编辑器脚本抛错: ' + e.message); process.exit(1);
}

/* ---- 导出并回读 ---- */
const src = ed.buildSource();
console.log(`2) 导出成功，生成 ${src.length} 字符`);

/* 语法有效性（直接丢给 node 解析） */
try { new Function(src); console.log('3) 导出文件语法有效 ✓'); }
catch (e) { bad('导出文件语法错误: ' + e.message); }

/* 回读：清掉旧的 KC3_ROUTES 再执行导出内容 */
delete global.KC3_ROUTES;
new Function(src)();
const RT = global.KC3_ROUTES;

/* ---- 逐字段比对 ---- */
console.log('4) 往返一致性比对');
if (RT.length !== ORIG.length) bad(`线路数 ${RT.length} ≠ ${ORIG.length}`);
let diff = 0, items = 0;
ORIG.forEach((o, i) => {
  const n = RT[i];
  if (!n) { bad(`${o.name} 丢失`); return; }
  for (const k of ['id', 'no', 'name']) if (o[k] !== n[k]) { bad(`${o.name}.${k}: ${o[k]} → ${n[k]}`); diff++; }
  if (o.seq.length !== n.seq.length) { bad(`${o.name} 项数 ${o.seq.length} → ${n.seq.length}`); diff++; return; }
  o.seq.forEach((os, j) => {
    items++;
    const ns = n.seq[j];
    if (os.id !== ns.id) { bad(`${o.name} 第${j+1}项 id: ${os.id} → ${ns.id}`); diff++; }
    if (os.src !== ns.src) { bad(`${o.name} 第${j+1}项 src: ${os.src} → ${ns.src}`); diff++; }
    const t1 = os.tag === undefined ? undefined : os.tag;
    const t2 = ns.tag === undefined ? undefined : ns.tag;
    if (t1 !== t2) { bad(`${o.name} 第${j+1}项 tag: ${t1} → ${t2}`); diff++; }
  });
});
console.log(`   比对 ${ORIG.length} 条线路 × ${items} 个节点：${diff ? '!! ' + diff + ' 处不一致' : '全部一致 ✓'}`);

/* ---- 应用层能否消费导出结果 ---- */
console.log('5) 导出结果能否被应用消费');
const store = {}; const mk = () => ({innerHTML:'',scrollTop:0,style:{},textContent:'',classList:{add(){},remove(){}}});
global.document = { getElementById: id => (store[id] || (store[id] = mk())), querySelectorAll: () => [] };
let disk = {}; global.localStorage = { getItem: k => (k in disk ? disk[k] : null), setItem:(k,v)=>{disk[k]=String(v)}, removeItem:k=>{delete disk[k]} };
try {
  const app = new Function(appSource() +
    '; return {S,render,ROUTES,routeItems,SPECIAL};')();
  for (const model of ['c1', 'c2']) {
    app.S.model = model;
    const want = model === 'c1' ? 16 : 15;
    const got = app.ROUTES.map(r => app.routeItems(r).length);
    const okAll = got.every(v => v === want);
    console.log(`   ${model.toUpperCase()} 各线路项数 [${got.join(', ')}] 应全为 ${want} → ${okAll ? '✓' : '✗'}`);
    if (!okAll) bad(model + ' 项数不符');
  }
  for (const sc of ['home', 'scan', 'mine', 'special', 'mix', 'scenario', 'lights', 'order']) {
    app.S.screen = sc; app.render();
  }
  console.log('   全页面渲染通过 ✓');
} catch (e) { bad('应用消费导出数据失败: ' + e.message); }

/* ---- 转义边界：教练可能输入任意字符 ---- */
console.log('6) 特殊字符边界（教练在文本框里可能输入任何东西）');
const cases = [
  ["单引号",     "测试'引号"],
  ["反斜杠",     "第\\1次"],
  ["反斜杠+引号", "a\\'b"],
  ["换行",       "第\n1\n次"],
  ["尖括号与斜杠", "</script><b>"],
  ["中英混合",   "第 1 次（右转）"]
];
for (const [name, val] of cases) {
  ed.R[0].seq[0].tag = val;
  const s = ed.buildSource();
  try {
    new Function(s);
    // 还要确认值本身被正确还原
    delete global.KC3_ROUTES; new Function(s)();
    const back = global.KC3_ROUTES[0].seq[0].tag;
    const expect = String(val).replace(/[\r\n]+/g, ' ').trim();
    if (back !== expect) bad(`${name}: 回读值 ${JSON.stringify(back)} ≠ ${JSON.stringify(expect)}`);
    else console.log(`   ${name.padEnd(7)} → 可解析且回读一致 ✓`);
  } catch (e) { bad(`${name}: 导出文件语法错误 —— ${e.message}`); }
}

console.log(fail ? `\n=> FAIL ${fail} 项` : '\n=> 全部通过 ✓');
process.exit(fail ? 1 : 0);
