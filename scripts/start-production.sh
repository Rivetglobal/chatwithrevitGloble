#!/usr/bin/env bash
# Production start: optionally pull main, always rebuild the client, then run the API
# (which also serves client/dist). Set AUTO_GIT_PULL=1 on a VPS so deploys pick up main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"

if [ "${AUTO_GIT_PULL:-0}" = "1" ]; then
  echo "[start] pulling origin/${BRANCH}"
  git -C "$ROOT" fetch origin "$BRANCH"
  git -C "$ROOT" checkout "$BRANCH"
  git -C "$ROOT" reset --hard "origin/${BRANCH}"
fi

echo "[start] installing server deps"
( cd "$ROOT/server" && npm install --no-audit --no-fund )

echo "[start] installing and building client"
( cd "$ROOT/client" && npm install --no-audit --no-fund && npm run build )

echo "[start] launching API"
cd "$ROOT/server"
exec node index.js
