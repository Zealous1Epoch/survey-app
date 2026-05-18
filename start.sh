#!/bin/bash
set -e

echo "🚀 启动问卷月..."
echo ""

# Kill any lingering processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start dev server in background
echo "  启动 Next.js..."
npm run dev -- -p 3000 &
DEV_PID=$!
sleep 4

# Start tunnel and capture URL
echo "  启动公网隧道..."
cloudflared tunnel --url http://localhost:3000 2>&1 | while read -r line; do
  echo "$line"
  if echo "$line" | grep -q "trycloudflare.com"; then
    URL=$(echo "$line" | grep -o 'https://[^ ]*trycloudflare.com')
    echo ""
    echo "✅ 公网地址: $URL"
    echo "   填入问卷的二维码页面即可生成正确链接"
  fi
done &

wait $DEV_PID
