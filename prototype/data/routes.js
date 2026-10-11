/* ============================================================
   科三路线通 · 线路数据
   ------------------------------------------------------------
   每条线路 = 官方 16 项的一个有序排列，用 items.js 里的 id 引用。
   这里不写任何中文说明文字（那些在 items.js 里），只写「顺序 + 来源 + 区分标签」。

   字段：
     id   引用 KC3_ITEMS 的键
     src  数据核实来源  std 国家必考 | pub 实测已核 | map 图上标注 | inf 待教练校准
     tag  同一项目在同一线路出现多次时的区分标签

   ⚠️ 顺序为待校准状态 —— 请教练按 docs 里的《教练校准清单》逐项确认后再定稿。
   ============================================================ */
window.KC3_ROUTES = [

  {
    id: 'l1', no: '01', name: '1 号线',
    seq: [
      { id: 'prep',      src: 'std' },
      { id: 'lighttest', src: 'std' },
      { id: 'start',     src: 'std' },
      { id: 'bus',       src: 'map' },
      { id: 'school',    src: 'map' },
      { id: 'overtake',  src: 'map' },
      { id: 'lane',      src: 'map' },
      { id: 'straight',  src: 'map' },
      { id: 'gear',      src: 'map' },
      { id: 'right',     src: 'inf' },
      { id: 'cross',     src: 'map' },
      { id: 'meet',      src: 'map' },
      { id: 'uturn',     src: 'map' },
      { id: 'left',      src: 'inf' },
      { id: 'zebra',     src: 'inf' },
      { id: 'park',      src: 'map' }
    ]
  },

  {
    id: 'l2', no: '02', name: '2 号线',
    seq: [
      { id: 'prep',      src: 'std' },
      { id: 'lighttest', src: 'std' },
      { id: 'start',     src: 'std' },
      { id: 'bus',       src: 'pub' },
      { id: 'overtake',  src: 'pub' },
      { id: 'right',     src: 'pub', tag: '第 1 次' },
      { id: 'straight',  src: 'pub' },
      { id: 'right',     src: 'pub', tag: '第 2 次' },
      { id: 'uturn',     src: 'pub' },
      { id: 'meet',      src: 'pub' },
      { id: 'cross',     src: 'pub' },
      { id: 'left',      src: 'pub', tag: '第 1 次' },
      { id: 'gear',      src: 'pub' },
      { id: 'left',      src: 'pub', tag: '第 2 次' },
      { id: 'lane',      src: 'pub' },
      { id: 'park',      src: 'pub' }
    ]
  },

  {
    id: 'l4a', no: '04A', name: '4 号线①',
    seq: [
      { id: 'prep',      src: 'std' },
      { id: 'lighttest', src: 'std' },
      { id: 'start',     src: 'std' },
      { id: 'bus',       src: 'map' },
      { id: 'school',    src: 'map' },
      { id: 'lane',      src: 'map' },
      { id: 'overtake',  src: 'map' },
      { id: 'right',     src: 'inf' },
      { id: 'straight',  src: 'map' },
      { id: 'gear',      src: 'map' },
      { id: 'cross',     src: 'map' },
      { id: 'meet',      src: 'map' },
      { id: 'uturn',     src: 'map' },
      { id: 'left',      src: 'inf' },
      { id: 'zebra',     src: 'inf' },
      { id: 'park',      src: 'map' }
    ]
  },

  {
    id: 'l4b', no: '04B', name: '4 号线②',
    seq: [
      { id: 'prep',      src: 'std' },
      { id: 'lighttest', src: 'std' },
      { id: 'start',     src: 'std' },
      { id: 'bus',       src: 'map' },
      { id: 'lane',      src: 'map' },
      { id: 'overtake',  src: 'map' },
      { id: 'right',     src: 'inf' },
      { id: 'straight',  src: 'map' },
      { id: 'gear',      src: 'map' },
      { id: 'cross',     src: 'map' },
      { id: 'meet',      src: 'map' },
      { id: 'uturn',     src: 'map' },
      { id: 'left',      src: 'inf' },
      { id: 'zebra',     src: 'inf' },
      { id: 'school',    src: 'map' },
      { id: 'park',      src: 'map' }
    ]
  }

];
