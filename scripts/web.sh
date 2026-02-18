#!/usr/bin/env bash
# W.E.B. — Wired Earning Bot
# Thin installer script — delegates to runtime setup wizard
# Usage: curl -fsSL https://your-domain.com/web.sh | sh

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  W.E.B. — Wired Earning Bot"
echo "  Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required."; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

WEB_DIR="$HOME/.web"
REPO_DIR="$WEB_DIR/repo"

mkdir -p "$WEB_DIR"

if [ -d "$REPO_DIR" ]; then
  echo "Updating W.E.B. repo..."
  cd "$REPO_DIR" && git pull
else
  echo "Cloning W.E.B. repo..."
  git clone https://github.com/your-org/web.git "$REPO_DIR"
fi

cd "$REPO_DIR"
npm install --silent
npm run build --silent

echo ""
echo "✓ W.E.B. installed successfully."
echo ""
echo "Starting setup wizard..."
echo ""

node dist/index.js --run
