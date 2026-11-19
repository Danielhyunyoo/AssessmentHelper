#!/bin/sh
set -e
cd "$(dirname "$0")"
logs="docker logs assessment-helper-tunnel-1"
[ -n "$1" ] && logs="ssh $1 $logs"
origin=$($logs 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -n 1)
if [ -z "$origin" ]; then
  echo "No tunnel URL yet. Start the stack with: docker compose up -d" >&2
  exit 1
fi
echo "Pointing the link at $origin"
cd link
npx --yes wrangler@4.160.1 deploy --var "ORIGIN:$origin"
