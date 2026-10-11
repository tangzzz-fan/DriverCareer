/* 测试公用件：从 prototype/index.html 提取应用脚本，并提供 DOM / localStorage 桩。
   测试脚本因此自包含 —— 不需要外部先跑构建，也不依赖临时目录。 */
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROT = path.join(ROOT, 'prototype');
const DATA = ['data/items.js', 'data/routes.js', 'data/special.js', 'data/lights.js'];

/* index.html 里最后那段内联 <script> 就是应用逻辑 */
function appSource(){
  const html   = fs.readFileSync(path.join(PROT, 'index.html'), 'utf8');
  const blocks = html.match(/<script>[\s\S]*?<\/script>/g) || [];
  if(!blocks.length) throw new Error('index.html 里找不到内联 <script>');
  return blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
}

/* 数据层同样是全局赋值，用 new Function 执行即可 */
function loadData(){
  global.window = global;
  DATA.forEach(f => new Function(fs.readFileSync(path.join(PROT, f), 'utf8'))());
}

function mkEl(){
  return { innerHTML:'', scrollTop:0, style:{}, textContent:'',
           classList:{ add(){}, remove(){} } };
}

/* 起一个干净的运行时：桩 DOM + 桩 localStorage，返回应用暴露出来的对象 */
function boot(opts = {}){
  const disk  = opts.disk || {};
  const store = {};
  global.window = global;
  global.localStorage = opts.noStorage
    ? { getItem(){ throw new Error('storage denied'); },
        setItem(){ throw new Error('storage denied'); },
        removeItem(){ throw new Error('storage denied'); } }
    : { getItem: k => (k in disk ? disk[k] : null),
        setItem: (k, v) => { disk[k] = String(v); },
        removeItem: k => { delete disk[k]; } };
  global.document = {
    getElementById: id => (store[id] || (store[id] = mkEl())),
    querySelectorAll: () => []
  };
  loadData();
  const names = opts.exports || [];
  const api = new Function(appSource() + '; return {' + names.join(',') + '};')();
  return { api, disk, store };
}

module.exports = { ROOT, PROT, DATA, appSource, loadData, boot, mkEl };
