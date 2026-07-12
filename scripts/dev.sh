#!/usr/bin/env bash
# Launches backend (uvicorn --reload) and frontend (vite dev) concurrently.
# This — not Docker Compose — is the primary dev loop; Compose is the
# deployment artifact (see docker/docker-compose.yml).
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() { kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true; }
trap cleanup EXIT

echo "Starting backend..."
(cd "$ROOT/backend" && source .venv/bin/activate && uvicorn app.main:app --reload --port 8010) &
BACKEND_PID=$!

echo "Starting frontend..."
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Backend health:  http://localhost:8010/api/health"
echo "Ad simulator:    http://localhost:5173/demo"
echo "Dashboard:       http://localhost:5173/dashboard"
echo ""
echo "First run? From backend/:  python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
echo "First run? From frontend/: npm install"

wait
