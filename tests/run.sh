#!/usr/bin/env bash
# 一键跑全部回归测试
#   用法：bash tests/run.sh            全部
#         NODE=/path/to/node bash tests/run.sh   指定 node
set -u
cd "$(dirname "$0")/.."
NODE_BIN="${NODE:-node}"

if ! command -v "$NODE_BIN" >/dev/null 2>&1; then
  echo "找不到 node。请安装 node，或用 NODE=/path/to/node 指定。"
  exit 1
fi

fail=0
for t in tests/*.test.js; do
  echo "──────────────────────────────────────────────"
  echo "▶ $t"
  echo "──────────────────────────────────────────────"
  "$NODE_BIN" "$t" || fail=1
done

echo
if [ "$fail" -eq 0 ]; then
  echo "✅ 全部测试通过"
else
  echo "❌ 有测试失败，见上方输出"
fi
exit "$fail"
