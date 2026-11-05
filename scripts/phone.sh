#!/bin/zsh
# npm run phone [path]: review the site on an iPhone from this Mac.
# With Xcode: real Safari on a simulated iPhone, as professional front-end
# developers review phone pages. Without it: a sized device frame in desktop
# Safari (same engine family, no touch), and how to get the real thing.
cd "$(dirname "$0")/.."
PORT=5174
ROUTE="${1:-/story.html}"
BASE="http://localhost:$PORT"

if ! curl -s -o /dev/null "$BASE"; then
  echo "Starting the dev server on port $PORT (logs in .shots/dev-server.log)..."
  mkdir -p .shots
  nohup npm run dev -- --port "$PORT" --strictPort > .shots/dev-server.log 2>&1 &
  for _ in {1..40}; do curl -s -o /dev/null "$BASE" && break; sleep 0.25; done
fi

if xcrun simctl help >/dev/null 2>&1; then
  # The newest iPhone that's installed, unless one is already running.
  if ! xcrun simctl list devices booted | grep -q iPhone; then
    UDID=$(xcrun simctl list devices available | grep -E '^ +iPhone [0-9]+ ' | tail -1 | grep -oE '[0-9A-F-]{36}')
    if [ -z "$UDID" ]; then
      echo "Xcode is installed, but no iPhone simulator is. In Xcode: Settings > Components > iOS."
      exit 1
    fi
    xcrun simctl boot "$UDID"
  fi
  open -a Simulator
  xcrun simctl openurl booted "$BASE$ROUTE"
  echo "Open in the Simulator: $BASE$ROUTE"
  echo "To inspect it: Safari > Develop > Simulator (turn on Safari's developer features first)."
else
  open -a Safari "$BASE/phone.html?page=$ROUTE"
  cat <<MSG
Opened the device frame in Safari: it checks sizes and layout, without touch.

For real Safari on a simulated iPhone:
  1. Install Xcode from the Mac App Store (free), open it once, and add the iOS platform.
  2. Run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  3. Run npm run phone again.
MSG
fi
