#!/bin/bash
# ─────────────────────────────────────────────────────────────
#   JARVIS-OS launcher
#   Double-click this file in Finder to start the server,
#   then automatically open http://localhost:3000 in your browser.
# ─────────────────────────────────────────────────────────────

# Always cd to the folder this script lives in (works no matter where
# you double-click it from)
cd "$(dirname "$0")" || exit 1

clear
cat <<'BANNER'

   ╔══════════════════════════════════════════════════╗
   ║                                                  ║
   ║         J . A . R . V . I . S .   O S            ║
   ║              Stark Industries · v9.3             ║
   ║                                                  ║
   ╚══════════════════════════════════════════════════╝

BANNER

# ── Check Node.js is installed ──────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "  ✕  Node.js is not installed."
  echo ""
  echo "     Install it from: https://nodejs.org"
  echo "     (Then double-click this file again.)"
  echo ""
  read -p "  Press ENTER to close..." _
  exit 1
fi

echo "  ✓ Node.js  $(node -v)"
echo "  ✓ npm      $(npm -v)"
echo ""

# ── Install dependencies on first run ───────────────────────
if [ ! -d "node_modules" ]; then
  echo "  ⟳ First run — installing dependencies..."
  echo ""
  npm install
  echo ""
fi

# ── Pick the port (default 3000, use $PORT if set) ──────────
PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

# ── Open the browser after the server is up ─────────────────
( sleep 2
  if command -v open >/dev/null 2>&1; then
    open "$URL"             # macOS
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"         # Linux
  fi
) &

echo "  ▸ Starting JARVIS-OS on ${URL}"
echo "  ▸ Press CTRL+C in this window to shut down."
echo ""

# ── Boot the server (foreground so the window stays open) ───
PORT="$PORT" npm start

# When the server stops, hold the window open so the user can read errors
echo ""
echo "  ▸ JARVIS-OS stopped."
read -p "  Press ENTER to close..." _
