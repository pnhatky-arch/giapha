#!/bin/zsh
set -e
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  echo "Cần cài Node.js 22.13 trở lên trước khi chạy."
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci
fi
npm run test:local
