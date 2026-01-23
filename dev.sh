#!/usr/bin/env sh
set -eu

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BACK_PORT="${BACK_PORT:-8000}"
NPM_FLAGS="${NPM_FLAGS:-}"

kill_port() {
  PORT="$1"
  if command -v lsof >/dev/null 2>&1; then
    PIDS="$(lsof -ti tcp:"$PORT" || true)"
    [ -n "${PIDS:-}" ] && kill -9 $PIDS 2>/dev/null || true
  fi
}

detect_front_cmd() {
  if npm run -s dev >/dev/null 2>&1; then
    echo "dev"
  elif npm run -s start >/dev/null 2>&1; then
    echo "start"
  else
    echo ""
  fi
}

echo "== Backend =="
kill_port "$BACK_PORT"
cd "$ROOT/backend"
[ -d .venv ] || python3 -m venv .venv
# shellcheck disable=SC1091
. .venv/bin/activate
pip -q install -U pip python-dotenv >/dev/null
pip -q install -r requirements.txt >/dev/null || true
python -m dotenv run -- uvicorn server:app --reload --port "$BACK_PORT" &
BACK_PID=$!

echo "== Frontend =="
cd "$ROOT/frontend"
npm install $NPM_FLAGS
FRONT_CMD="$(detect_front_cmd)"
if [ -z "$FRONT_CMD" ]; then
  echo "ERROR: não encontrei scripts 'dev' nem 'start'. Corre: npm run"
  kill $BACK_PID 2>/dev/null || true
  exit 1
fi
npm run "$FRONT_CMD" &
FRONT_PID=$!

trap 'kill $BACK_PID $FRONT_PID 2>/dev/null || true' INT TERM EXIT
wait
