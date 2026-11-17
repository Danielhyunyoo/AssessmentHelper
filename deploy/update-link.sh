#!/bin/sh
set -e
cd "$(dirname "$0")"
origin=$(docker compose logs tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -n 1)
if [ -z "$origin" ]; then
  echo "No tunnel URL yet. Start the stack with: docker compose up -d" >&2
  exit 1
fi
echo "Pointing the link at $origin"
cd link
npx --yes wrangler@4.160.1 deploy --var "ORIGIN:$origin"
