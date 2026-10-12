/* 动作拆解回归：数据结构 / 车型分支 / 分组 / 关键顺序约束 / 渲染
   运行：node tests/05-steps.test.js */
const { boot } = require('./harness');

let fail = 0;
const bad = m => { console.log('  !! ' + m); fail++; };
const eq  = (a, b, m) => { if (a !== b) bad(`${m} → 期望 ${JSON.stringify(b)}，实得 ${JSON.stringify(a)}`); };
const ok  = m => console.log('  ✓ ' + m);

const EXPORTS = ['S','render','ITEMS','ROUTES','stepOf','stepList','stepText',
                 'itemGroups','itemIds','vScan','STEP_K'];
const IDS = ['prep','lighttest','start','straight','gear','lane','overtake','cross',
             'left','right','zebra','school','bus','meet','park','uturn'];
const MODELS = ['c1','c2'];

let api, store;
function fresh(model = 'c1') {
  const r = boot({ exports: EXPORTS });
  api = r.api; store = r.store;
  api.S.model = model;
}
const html = () => store['app'].innerHTML;
/* 判断顺序 / 词表前先剥掉括号里的说明——说明里常会提到后面步骤的关键词 */
const clean = t => t.replace(/（[^）]*）/g, '');
/* 该车型下实际用到的步骤文本 */
function textsOf(it, model) { api.S.model = model; return api.stepList(it).map(s => api.stepText(s)); }
const skip = (it, model) => it.c1 && model === 'c2';

/* ---------------------------------------------------------------- 1 */
console.log('\n1) 拆解数据结构');
fresh('c1');
const missing = IDS.filter(id => {
  const it = api.ITEMS[id];
  if (!it) return true;
  if (!it.group) return true;
  const list = it.steps || it.stepsC1 || it.stepsC2;
  return !Array.isArray(list) || !list.length;
});
eq(missing.length, 0, '16 项都有分组与拆解' + (missing.length ? '，缺：' + missing.join('、') : ''));

const problems = [];
MODELS.forEach(model => {
  api.S.model = model;
  IDS.forEach(id => {
    const it = api.ITEMS[id];
    if (skip(it, model)) return;
    const list = api.stepList(it);
    if (!list.length) { problems.push(`${id}/${model} 没有拆解`); return; }
    const texts = textsOf(it, model);
    if (list.length < 3) problems.push(`${id}/${model} 只有 ${list.length} 步`);
    texts.forEach((t, i) => {
      if (!t || !t.trim()) problems.push(`${id}/${model} 第 ${i + 1} 步为空`);
      else if (t.length > 60) problems.push(`${id}/${model} 第 ${i + 1} 步过长（${t.length} 字）`);
    });
    if (new Set(texts).size !== texts.length) problems.push(`${id}/${model} 有重复步骤`);
    list.forEach((s, i) => {
      const o = api.stepOf(s);
      if (o.k && !Object.prototype.hasOwnProperty.call(api.STEP_K, o.k))
        problems.push(`${id}/${model} 第 ${i + 1} 步标签「${o.k}」非法`);
    });
  });
});
eq(problems.length, 0, '逐项检查' + (problems.length ? '：' + problems.slice(0, 4).join(' / ') : '全部合规'));
if (!problems.length) {
  let steps = 0, chars = 0;
  MODELS.forEach(m => { api.S.model = m; IDS.forEach(id => {
    const it = api.ITEMS[id]; if (skip(it, m)) return;
    const t = textsOf(it, m); if (m === 'c1') { steps += t.length; chars += t.join('').length; }
  }); });
  ok(`2 车型 × 16 项的结构检查全部通过`);
  console.log(`   C1 共 ${steps} 条动作步骤，平均每步 ${Math.round(chars / steps)} 字`);
}

/* ---------------------------------------------------------------- 2 */
console.log('\n2) 车型分支');
api.S.model = 'c1';
if (api.stepList(api.ITEMS.start) !== api.ITEMS.start.stepsC1) bad('C1 起步未取 stepsC1');
api.S.model = 'c2';
if (api.stepList(api.ITEMS.start) !== api.ITEMS.start.stepsC2) bad('C2 起步未取 stepsC2');
if (api.stepList(api.ITEMS.park) !== api.ITEMS.park.stepsC2) bad('C2 靠边停车未取 stepsC2');

api.S.model = 'c1';
const seat1 = api.stepText(api.ITEMS.prep.steps[5]);
api.S.model = 'c2';
const seat2 = api.stepText(api.ITEMS.prep.steps[5]);
if (!seat1.includes('离合')) bad('C1 的座椅步骤没提到离合');
else if (!seat2.includes('刹车')) bad('C2 的座椅步骤没提到刹车');
else if (seat1 === seat2) bad('C1/C2 的座椅步骤没有分叉');
else ok('同一句步骤按车型分叉：C1「' + seat1.slice(6, 14) + '…」/ C2「' + seat2.slice(6, 14) + '…」');

api.S.model = 'c2';
eq(api.itemIds().length, 15, 'C2 项目数');
if (api.itemIds().includes('gear')) bad('C2 下仍列出加减挡位操作');
api.S.model = 'c1';
eq(api.itemIds().length, 16, 'C1 项目数');

/* 手动挡表述串到自动挡下，靠肉眼很容易漏，这里自动查一遍。
   「挡位」不进黑名单——C2 也有挡位（P 挡），泛指挡位不算串味 */
const C1ONLY = /离合|换挡|降挡|升挡|[一二三四]挡|空挡/;
const bleed = [];
api.S.model = 'c2';
IDS.forEach(id => {
  const it = api.ITEMS[id];
  if (it.c1) return;                        /* C2 本来就不考这一项 */
  textsOf(it, 'c2').map(clean).forEach((t, i) => {
    if (C1ONLY.test(t)) bleed.push(`${id} 第 ${i + 1} 步「${t}」`);
  });
});
eq(bleed.length, 0, 'C2 拆解里串入手动挡表述' + (bleed.length ? '：' + bleed.join(' / ') : '，没有串味'));
if (!bleed.length) ok('C2 的每一条步骤都只讲油门刹车，不提离合与挡位');

/* ---------------------------------------------------------------- 3 */
console.log('\n3) 分组');
const gs = api.itemGroups();
eq(new Set(gs).size, gs.length, '分组名不重复');
eq(gs[0], '上车与起步', '首组');
const orphan = IDS.filter(id => !gs.includes(api.ITEMS[id].group || '其他'));
eq(orphan.length, 0, '没有游离在分组外的项目');
ok('分组顺序 ' + gs.join(' → '));

/* ---------------------------------------------------------------- 4 */
console.log('\n4) 关键顺序约束：转向灯与观察都不能晚于松手刹');
const viol = [];
MODELS.forEach(model => {
  api.S.model = model;
  IDS.forEach(id => {
    const it = api.ITEMS[id];
    if (skip(it, model)) return;
    const texts = textsOf(it, model).map(clean);
    const iHand = texts.findIndex(t => t.includes('手刹'));
    if (iHand < 0) return;
    const iLamp = texts.findIndex(t => t.includes('转向灯'));
    const iObs  = texts.findIndex(t => t.includes('回头') || t.includes('后视镜') || t.includes('观察'));
    if (iLamp > -1 && iLamp > iHand) viol.push(`${id}/${model}：转向灯排在松手刹之后`);
    if (iObs  > -1 && iObs  > iHand) viol.push(`${id}/${model}：观察排在松手刹之后`);
  });
});
eq(viol.length, 0, '违反约束' + (viol.length ? '：' + viol.join(' / ') : '，全部满足'));
if (!viol.length) ok('所有含手刹的项：转向灯与观察都排在松手刹之前');
const brakeOrder = [];
MODELS.forEach(model => {
  api.S.model = model;
  const texts = textsOf(api.ITEMS.park, model).map(clean);
  const iP = texts.findIndex(t => t.includes('P 挡') || t.includes('空挡'));
  const iH = texts.findIndex(t => t.includes('手刹'));
  if (!(iP > -1 && iH > -1 && iP <= iH)) brakeOrder.push(`park/${model}：应「先挂挡、再拉手刹」`);
});
eq(brakeOrder.length, 0, '靠边停车收尾顺序' + (brakeOrder.length ? '：' + brakeOrder.join(' / ') : '正确'));

/* ---------------------------------------------------------------- 5 */
console.log('\n5) 步骤类型标签');
const tally = {};
MODELS.forEach(m => { api.S.model = m; IDS.forEach(id => {
  const it = api.ITEMS[id]; if (skip(it, m)) return;
  if (m !== 'c1') return;
  api.stepList(it).forEach(s => { const o = api.stepOf(s); if (o.k) tally[o.k] = (tally[o.k] || 0) + 1; });
}); });
Object.keys(api.STEP_K).forEach(k => { if (!tally[k]) bad('标签「' + k + '」一次都没用到'); });
const totalTag = Object.keys(tally).reduce((a, k) => a + tally[k], 0);
if (tally['看'] / totalTag < 0.2) bad('「看」类步骤占比过低（' + tally['看'] + '/' + totalTag + '）');
else ok('标签分布 ' + Object.keys(api.STEP_K).map(k => `${k}=${tally[k] || 0}`).join('  ') +
        `（观察类占 ${Math.round(tally['看'] / totalTag * 100)}%）`);

/* ---------------------------------------------------------------- 6 */
console.log('\n6) 渲染');
fresh('c1');
api.S.screen = 'scan'; api.S.scan = 'route'; api.S.open = 'r0'; api.render();
if (html().indexOf('动作拆解') > -1) ok('按线路视图展开后有「动作拆解」');
else bad('按线路视图缺少动作拆解');
const firstIt = api.ITEMS[api.ROUTES[0].seq[0].id];
if (html().indexOf(api.stepText(api.stepList(firstIt)[0])) > -1) ok('步骤文本已渲染');
else bad('步骤文本未渲染');
if (html().indexOf('sk ') > -1) ok('步骤类型标签已渲染');
else bad('步骤类型标签未渲染');

api.S.scan = 'action'; api.S.open = null; api.render();
const tips = (html().match(/data-tip="/g) || []).length;
eq(tips, 16, '按动作视图 C1 的可展开项数');
const keys = (html().match(/data-tip="(a[^"]+)"/g) || []).map(s => s.slice(10, -1));
eq(new Set(keys).size, keys.length, '同一个项目只出现一次');
if (html().indexOf('上车与起步') > -1 && html().indexOf('停车与调头') > -1) ok('分组标题已渲染');
else bad('分组标题缺失');

api.S.open = 'aprep'; api.render();
eq((html().match(/class="tli open"/g) || []).length, 1, '同时只有一项展开');
if (html().indexOf('离合器能一脚踩到底') > -1) ok('C1 展开显示手动挡文本');
else bad('C1 展开的座椅步骤不对');

api.S.model = 'c2'; api.S.open = 'aprep'; api.render();
if (html().indexOf('刹车能一脚踩到底') > -1 && html().indexOf('离合器能一脚踩到底') === -1)
  ok('C2 展开显示自动挡文本，且不残留手动挡表述');
else bad('C2 展开的座椅步骤不对');
eq((html().match(/data-tip="/g) || []).length, 15, '按动作视图 C2 的可展开项数');
if (html().indexOf('加减挡位操作') === -1) ok('C2 下不出现加减挡位操作');
else bad('C2 下仍出现加减挡位操作');

/* ---------------------------------------------------------------- 7 */
console.log('\n7) 对照表与补充说明');
fresh('c1');
const gear = api.ITEMS.gear;
if (Array.isArray(gear.ref) && gear.ref.length === 4 && gear.ref.every(r => r.length === 2))
  ok('加减挡位对照表 4 行：' + gear.ref.map(r => r[0] + ' ' + r[1]).join(' / '));
else bad('加减挡位对照表结构不对');
if (Array.isArray(api.ITEMS.park.ref) && api.ITEMS.park.ref.length === 3) ok('靠边停车距离标准 3 行');
else bad('靠边停车对照表结构不对');
api.S.screen = 'scan'; api.S.scan = 'action'; api.S.open = 'agear'; api.render();
if (html().indexOf('一挡') > -1 && html().indexOf('reftable') > -1) ok('对照表已渲染');
else bad('对照表未渲染');

const noted = IDS.filter(id => api.ITEMS[id].note);
if (noted.length >= 6) ok(`${noted.length} 项带补充说明`);
else bad('带补充说明的项目偏少（' + noted.length + '）');

console.log(fail ? `\n=> FAIL ${fail} 项` : '\n=> 全部通过 ✓');
process.exit(fail ? 1 : 0);
