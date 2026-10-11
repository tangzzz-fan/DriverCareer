/* 错题重练回归：结构化错题 / 出题还原 / 答对即清 / 车型隔离 / 持久化
   运行：node tests/04-review.test.js */
const { boot } = require('./harness');

let fail = 0;
const bad = m => { console.log('  !! ' + m); fail++; };
const eq  = (a, b, m) => { if (a !== b) bad(`${m} → 期望 ${JSON.stringify(b)}，实得 ${JSON.stringify(a)}`); };
const ok  = m => console.log('  ✓ ' + m);

const EXPORTS = ['S','render','vHome','vMine','vReview','vReviewResult','ROUTES','SPECIAL','ITEMS',
  'addMistake','mkey','dropMistake','reviewable','stepMistake','lightMistake','buildReview',
  'buildReviewQ','judgeReview','mistakeText','kindLabel','recordOrderResult','recordOrderMistakes',
  'routeItems','MAX_M','RV_MAX','reviewStat','goodMistake'];

let api, disk, store;
function fresh(opts = {}) {
  const r = boot(Object.assign({ exports: EXPORTS }, opts));
  api = r.api; disk = r.disk; store = r.store;
}
const html = () => store['app'].innerHTML;

/* ---------------------------------------------------------------- 1 */
console.log('\n1) stepMistake：把「错在第几步」还原成单点题');
fresh();
const L = api.routeItems(api.ROUTES[0]).map(x => x.label);
const sm = api.stepMistake(L, 5, '1 号线', 'c1');
eq(sm.k, 'order', '题型');
eq(sm.pos, 5, '位置');
eq(sm.answer, L[5], '答案 = 该位置正确项');
eq(sm.cue, L[4], '题面 = 前一项');
eq(sm.opts.length, 4, '选项数');
eq(new Set(sm.opts).size, 4, '选项无重复');
eq(sm.opts[sm.ans], sm.answer, 'ans 指向答案');
if (sm.opts.includes(L[4])) bad('干扰项不该包含题面那一步');
else ok('干扰项不含题面项（不能靠「刚念过」蒙对）');

const first = api.stepMistake(L, 0, '1 号线', 'c1');
eq(first.cue, '', '首项没有题面');
eq(first.opts[first.ans], L[0], '首项的答案仍正确');
const tiny = api.stepMistake(['甲', '乙'], 0, '小专项', 'c1');
eq(tiny.opts[tiny.ans], '甲', '步骤极少的边界：ans 仍指向答案');
if (api.ROUTES.every((r, i) => {
  const a = api.routeItems(r).map(x => x.label);
  return a.every((_, k) => { const m = api.stepMistake(a, k, r.name, 'c1'); return m && m.opts[m.ans] === m.answer; });
})) ok('四条线路 × 每一步，还原出的答案都正确');
else bad('顺序题还原出现错误答案');

/* ---------------------------------------------------------------- 2 */
console.log('\n2) lightMistake：灯光题还原');
fresh();
const lm = api.lightMistake('雾天行驶', '雾灯 + 双闪');
eq(lm.opts.length, 4, '选项数是 4');
eq(lm.opts[lm.ans], '雾灯 + 双闪', 'ans 指向正确操作');
eq(new Set(lm.opts).size, 4, '选项无重复');
eq(lm.model, '', '灯光题不分车型');
ok('灯光题还原正常');

/* ---------------------------------------------------------------- 3 */
console.log('\n3) addMistake：去重与计数');
fresh();
api.addMistake({ k:'light', scene:'夜间通过路口', opts:['A','B','C','D'], ans:0 });
api.addMistake({ k:'light', scene:'夜间通过路口', opts:['A','B','C','D'], ans:0 });
eq(api.S.mistakes.length, 1, '同一题错两次只留一条');
eq(api.S.mistakes[0].n, 2, '累计错误次数');
api.addMistake({ k:'light', scene:'雾天', opts:['A','B','C','D'], ans:1 });
eq(api.S.mistakes.length, 2, '不同题各留一条');
eq(api.S.mistakes[0].scene, '雾天', '最近错的排最前');

/* ---------------------------------------------------------------- 4 */
console.log('\n4) 上限截断');
fresh();
for (let i = 0; i < 40; i++)
  api.addMistake({ k:'light', scene:'场景' + i, opts:['A','B','C','D'], ans:0 });
eq(api.S.mistakes.length, api.MAX_M, `错题本上限 ${api.MAX_M}`);
for (const m of [1, 2, 3]) api.addMistake({ k:'light', scene:'去重' + m, opts:['A','B','C','D'], ans:0 });
const rev = api.buildReview();
eq(rev.length, api.RV_MAX, `单轮重练上限 ${api.RV_MAX}`);
ok('超出部分不会溢出到重练回合里');

/* ---------------------------------------------------------------- 5 */
console.log('\n5) 顺序题：只记「错在哪一步」');
fresh();
api.S.model = 'c1'; api.S.r = 0; api.S.Q = null; api.S.screen = 'order'; api.render();
let q = api.S.Q;
q.ans = q.items.map((_, i) => i);                  /* 全对 */
api.recordOrderResult();
eq(api.S.mistakes.length, 0, '全对不留错题');

fresh();
api.S.model = 'c1'; api.S.r = 0; api.S.Q = null; api.S.screen = 'order'; api.render();
q = api.S.Q;
q.ans = q.items.map((_, i) => i);
[q.ans[2], q.ans[3]] = [q.ans[3], q.ans[2]];       /* 交换第 3、4 步 */
api.recordOrderResult();
eq(api.S.mistakes.length, 2, '错了 2 步就记 2 条');
eq(api.S.mistakes.map(m => m.pos).sort().join(','), '2,3', '记的是出错的位置');
const rr = api.buildReview();
eq(rr.length, 2, '两条都能还原成题');
rr.forEach((x, k) =>
  eq(x.opts[x.ans], q.items[api.S.mistakes[k].pos].label, `还原题的答案是原序列第 ${api.S.mistakes[k].pos + 1} 项`));
if (rr.every(x => x.tag.indexOf('·') > -1 && x.prompt)) ok('题面带线路名与提问');
else bad('还原题缺少题面信息');

/* ---------------------------------------------------------------- 6 */
console.log('\n6) buildReview：五种题型都能还原');
fresh();
api.S.model = 'c1';
api.addMistake({ k:'order', model:'c1', group:'1 号线', pos:2, cue:'前一步',
                 answer:'直线行驶', opts:['直线行驶','超车','掉头','会车'], ans:0 });
api.addMistake({ k:'scenario', model:'c1', ri:0, cue:'变更车道', route:'1 号线',
                 opts:['直线行驶','超车','掉头','会车'], ans:0 });
api.addMistake({ k:'mix', model:'c1', ri:1, from:5, seg:['a','b','c','d'] });
api.addMistake({ k:'light', model:'', scene:'雾天行驶',
                 opts:['雾灯 + 双闪','近光灯','远光灯','关闭所有灯光'], ans:0 });
api.addMistake({ k:'spchoice', model:'c1', title:'超车新规', q:'自动挡超车要提速到多少？',
                 opts:['15km/h','20km/h','25km/h','30km/h'], ans:2, tip:'250 米内完成' });
const list = api.buildReview();
eq(list.length, 5, '五条错题 → 五道题');
eq(list[2].opts.length, api.ROUTES.length, '跨线路题的选项 = 线路数量');
eq(list[2].opts[list[2].ans], api.ROUTES[1].name, '跨线路题的答案指向正确线路');
for (const x of list) {
  if (!x.key || !x.tag || !x.prompt) bad('题面字段缺失：' + JSON.stringify(x.key));
  if (!(x.ans >= 0 && x.ans < x.opts.length)) bad('ans 越界：' + x.tag);
  if (new Set(x.opts).size !== x.opts.length) bad('选项有重复：' + x.tag);
  if (typeof x.opts[x.ans] !== 'string') bad('答案不是文本：' + x.tag);
  if (!x.exp) bad('缺少解析：' + x.tag);
}
ok('五类题型的答案下标、选项唯一性、解析字段全部自洽');

/* ---------------------------------------------------------------- 7 */
console.log('\n7) 车型隔离');
fresh();
api.S.model = 'c1';
api.addMistake({ k:'spchoice', model:'c1', title:'油离配合', q:'?', opts:['A','B'], ans:0, tip:'t' });
api.addMistake({ k:'spchoice', model:'c2', title:'踏板使用', q:'?', opts:['A','B'], ans:0, tip:'t' });
api.addMistake({ k:'light', model:'', scene:'雾天', opts:['A','B','C','D'], ans:0 });
eq(api.reviewable().length, 2, 'C1 下可重练 = C1 专项 + 通用灯光');
api.S.model = 'c2';
eq(api.reviewable().length, 2, 'C2 下可重练 = C2 专项 + 通用灯光');
eq(api.reviewable().filter(m => m.k === 'spchoice').map(m => m.title).join(), '踏板使用', '专项题按车型隔离');
ok('灯光错题跨车型保留，专项错题不串车型');

/* ---------------------------------------------------------------- 8 */
console.log('\n8) judgeReview：答对即清、答错留存');
fresh();
api.S.model = 'c1';
api.addMistake({ k:'light', scene:'题一', opts:['A','B','C','D'], ans:1 });
api.addMistake({ k:'light', scene:'题二', opts:['A','B','C','D'], ans:2 });
api.S.rv = { list: api.buildReview(), i: 0, ok: 0, log: [] };
eq(api.S.rv.list[0].key, api.mkey(api.S.mistakes[0]), '出题顺序与错题顺序一致');

eq(api.judgeReview(0, 0), false, '答错 → false');
eq(api.S.mistakes.length, 2, '答错的仍留在错题本');
eq(api.S.rv.ok, 0, '答错不计分');
eq(api.judgeReview(0, 1), null, '同一题重复提交被拒绝');
eq(api.S.rv.ok, 0, '重复提交不影响计分');

eq(api.judgeReview(1, 1), true, '答对 → true');
eq(api.S.mistakes.length, 1, '答对的从错题本移除');
eq(api.S.mistakes[0].scene, '题二', '留下的正是没答对的那条');
eq(api.S.rv.ok, 1, '答对计数');

eq(api.judgeReview(9, 0), null, '越界下标安全返回');
api.S.rv = null;
eq(api.judgeReview(0, 0), null, '没有会话时安全返回');
ok('闭环正确：答对即清，答错留下次');

/* ---------------------------------------------------------------- 9 */
console.log('\n9) 渲染');
fresh();
api.S.model = 'c1';
api.S.screen = 'review'; api.S.rv = null; api.render();
if (html().indexOf('没有可重练的错题') > -1) ok('无错题时显示空态');
else bad('空态文案缺失');

api.addMistake({ k:'light', model:'', scene:'雾天行驶',
                 opts:['雾灯 + 双闪','近光灯','远光灯','关闭所有灯光'], ans:0 });
api.S.screen = 'review'; api.S.rv = null; api.render();
if (html().indexOf('错题重练') > -1 && html().indexOf('第 1/1 题') > -1) ok('题目页渲染');
else bad('题目页缺少题号');
if (html().indexOf('雾灯 + 双闪') > -1) ok('选项已渲染');
else bad('选项未渲染');

api.S.rv.log[0] = 1; api.render();                       /* 故意答错 */
if (html().indexOf('正确答案') > -1 && html().indexOf('留下次再练') > -1) ok('答错反馈正确');
else bad('答错反馈缺失');

api.S.rv.i = 1; api.render();
if (html().indexOf('已清掉') > -1 && html().indexOf('剩余错题') > -1) ok('结果页渲染');
else bad('结果页缺失');

api.S.screen = 'mine'; api.render();
if (html().indexOf('重练这') > -1 && html().indexOf('灯光') > -1) ok('「我的」显示重练入口与错题列表');
else bad('「我的」缺少重练入口');

api.S.screen = 'home'; api.render();
if (html().indexOf('错题重练') > -1) ok('首页显示重练入口');
else bad('首页缺少重练入口');

api.S.mistakes = []; api.S.screen = 'home'; api.render();
if (html().indexOf('错题重练') === -1) ok('没有错题时首页不显示入口');
else bad('空错题本仍显示入口');

/* ---------------------------------------------------------------- 10 */
console.log('\n10) 持久化与旧格式兼容');
const d = {};
let r = boot({ exports: EXPORTS, disk: d });
r.api.S.model = 'c1';
r.api.addMistake({ k:'light', scene:'雾天', opts:['A','B','C','D'], ans:0 });
r.api.S.screen = 'home'; r.api.render();                  /* render 内部会 save() */
r = boot({ exports: EXPORTS, disk: d });                  /* 冷启动 */
eq(r.api.S.mistakes.length, 1, '重启后错题仍在');
eq(r.api.S.mistakes[0].k, 'light', '结构化字段完整');
eq(r.api.buildReview().length, 1, '重启后仍可重练');

const d2 = { 'kc3.v1': JSON.stringify({ model:'c2', mistakes:[
  { q:'旧版纯文本错题', from:'灯光模拟' },
  { k:'light', scene:'雾天', opts:['A','B','C','D'], ans:0 }
] }) };
r = boot({ exports: EXPORTS, disk: d2 });
eq(r.api.S.mistakes.length, 1, '旧的纯文本错题被丢弃');
eq(r.api.S.mistakes[0].k, 'light', '结构化错题保留');
eq(r.api.S.model, 'c2', '车型偏好照常恢复');

/* ---------------------------------------------------------------- 11 */
console.log('\n11) 隐私模式降级');
let crashed = false;
try {
  const r2 = boot({ exports: EXPORTS, noStorage: true });
  r2.api.addMistake({ k:'light', scene:'雾天', opts:['A','B','C','D'], ans:0 });
  r2.api.S.screen = 'review'; r2.api.S.rv = null; r2.api.render();
  r2.api.S.rv.log[0] = 0; r2.api.render();
} catch (e) { crashed = true; bad('localStorage 不可用时崩溃：' + e.message); }
if (!crashed) ok('localStorage 被禁用时重练仍可用');

/* ---------------------------------------------------------------- 12 */
console.log('\n12) 坏数据防护');
fresh();
api.S.model = 'c1';
api.S.mistakes = [
  { k:'light', scene:'缺选项', ans:0 },                              /* 没有 opts */
  { k:'light', scene:'下标越界', opts:['A','B'], ans:5 },             /* ans 超出范围 */
  { k:'mix', model:'c1', ri:9, from:0, seg:['a'] },                  /* 线路下标越界 */
  { k:'light', scene:'正常', opts:['A','B','C','D'], ans:0 },         /* 唯一完好的 */
  null, undefined, 'x'
];
let thrown = null;
try {
  api.S.screen = 'review'; api.S.rv = null; api.render();
  api.S.screen = 'mine';   api.render();
  api.S.screen = 'home';   api.render();
} catch (e) { thrown = e.message; }
if (thrown) bad('坏数据导致渲染崩溃：' + thrown);
else ok('坏数据被跳过，页面不崩');
eq(api.buildReview().length, 1, '只有结构完好的错题进入重练');
eq(api.reviewStat().n, 1, '入口的本轮题数只算能出题的');
eq(api.reviewStat().total, 4, '总条数只算「带 k 的结构化错题」');

console.log(fail ? `\n=> FAIL ${fail} 项` : '\n=> 全部通过 ✓');
process.exit(fail ? 1 : 0);
