#!/bin/bash

# ==============================================================================
# EVALSCAN — SINGLE-CLICK STARTUP SCRIPT (Production)
# ==============================================================================

set -e

APP_DIR="/evalscan"
API_DIR="$APP_DIR/eval-api"
UI_DIR="$APP_DIR/eval-ui"

echo "🚀 Launching Evaluation System..."

# 1. Build UI
echo "🏗️ Building Frontend..."
cd "$UI_DIR"
npm run build

# 2. Start/Restart API
echo "🔄 Starting API via PM2..."
cd "$API_DIR"
pm2 delete eval-api 2>/dev/null || true
pm2 start ecosystem.config.js --env production

# 3. Reload Nginx
echo "⚙️ Reloading Nginx Configuration..."
if [ -f "$APP_DIR/nginx.conf.template" ]; then
    echo "   Using nginx.conf.template..."
    sudo cp "$APP_DIR/nginx.conf.template" /etc/nginx/sites-available/evalscan
    sudo ln -sf /etc/nginx/sites-available/evalscan /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
else
    echo "⚠️ Warning: nginx.conf.template not found. Skipping Nginx reload."
fi

echo "✨ Application is live! Check status with 'pm2 status'."
