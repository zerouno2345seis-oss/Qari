#!/bin/bash
# Double-click this file on your Mac to install dependencies (first run only) and open MacPulse.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Installing Node.js with Homebrew..."
    brew install node || exit 1
  else
    osascript -e 'display dialog "MacPulse needs Node.js. The download page will open; install it, then double-click this file again." buttons {"OK"}' >/dev/null 2>&1
    open "https://nodejs.org/en/download"
    exit 1
  fi
fi

if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (a few minutes)..."
  npm install --no-audit --no-fund || { echo "npm install failed"; read -n 1 -p "Press any key to close"; exit 1; }
fi

echo "Starting MacPulse..."
npm start
