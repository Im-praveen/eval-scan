#!/bin/bash

# ==============================================================================
# EVALSCAN — MONOLITHIC DEPLOYMENT SCRIPT (AWS EC2 / Ubuntu)
# ==============================================================================

set -e

APP_DIR="/var/www/evalscan"
# Use absolute paths from project root
API_DIR="$APP_DIR/eval-api"
UI_DIR="$APP_DIR/eval-ui"

echo "🚀 Starting Automated Monolithic Deployment..."

# 1. Update source code (optional, assumes git handles this)
# git pull

# 2. Setup Backend Dependencies
echo "📦 Installing Backend Dependencies..."
cd "$API_DIR"
npm install --production

# 3. Setup Frontend Build
echo "🏗️ Building Frontend Resources..."
cd "$UI_DIR"
npm install
npm run build

# 4. Restart Process Management (PM2)
echo "🔄 Restarting API Process..."
cd "$API_DIR"
# Check if PM2 process exists
if pm2 show evalscan-api > /dev/null; then
    pm2 restart evalscan-api
else
    pm2 start ecosystem.config.js --env production
fi

# 5. Reload Nginx (Optional, normally only if config changed)
# echo "⚙️ Reloading Nginx..."
# sudo systemctl reload nginx

echo "✅ Deployment Successful!"
pm2 status
