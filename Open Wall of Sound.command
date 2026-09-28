#!/bin/zsh
# Double-click to open the Wall of Sound in Chrome.
# Starts the local server if it isn't already running. Close this window to stop it.

cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
URL="http://localhost:5174"

open_app() {
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -a "Google Chrome" "$URL"
  else
    open "$URL"
  fi
}

# Already running (for example from another window): just open it.
if curl -s -o /dev/null "$URL"; then
  open_app
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js isn't installed. Get the LTS installer from https://nodejs.org, then try again."
  read -k 1 "?Press any key to close."
  exit 1
fi

# First run on a fresh copy: install the packages.
[ -d node_modules ] || npm install

echo "Starting the Wall of Sound at $URL ..."
npm run dev -- --port 5174 --strictPort &
SERVER=$!

for i in {1..60}; do
  curl -s -o /dev/null "$URL" && break
  sleep 0.5
done
open_app

echo
echo "Running. Close this window (or press Ctrl+C) to stop the server."
wait $SERVER
