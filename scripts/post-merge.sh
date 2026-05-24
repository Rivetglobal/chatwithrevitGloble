#!/bin/bash
# Runs automatically after a task agent's branch is merged into main.
# Keep idempotent, fast, and non-interactive.
set -e

echo "[post-merge] installing server deps"
( cd server && npm install --no-audit --no-fund --silent )

echo "[post-merge] installing client deps"
( cd client && npm install --no-audit --no-fund --silent )

echo "[post-merge] done"
