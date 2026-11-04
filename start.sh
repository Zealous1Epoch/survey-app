#!/bin/bash
set -e

echo "🚀 启动问卷月..."
echo ""

# Force kill all lingering processes
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "cloudflared" 2>/dev/null || true
sleep 2

# Force free port 3000
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Start production server
echo "  启动 Next.js (生产模式)..."
npm start -- -p 3000 &
SERVER_PID=$!
sleep 4

# Wait until Next.js actually responds
echo "  等待 Next.js 就绪..."
for i in $(seq 1 15); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
  if [ "$CODE" != "000" ]; then
    echo "  Next.js 已就绪 (HTTP $CODE)"
    break
  fi
  sleep 1
done

# Start named Cloudflare tunnel with custom domain
echo "  启动 Cloudflare 隧道..."
trap "kill \$SERVER_PID 2>/dev/null; pkill -f 'cloudflared tunnel run' 2>/dev/null" EXIT

cloudflared tunnel --config ~/.cloudflared/config.yml run survey-tunnel &
TUNNEL_PID=$!

echo ""
echo "本地: http://localhost:3000"
echo "公网: https://survey.050423.xyz"
echo ""
echo "  按 Ctrl+C 停止所有服务"

wait $SERVER_PID
