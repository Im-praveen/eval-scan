#!/bin/bash

# ==============================================================================
# EVALSCAN — PRODUCTION INSTALLATION SCRIPT (Ubuntu/Linux)
# ==============================================================================

set -e

APP_DIR="/evalscan"
API_DIR="$APP_DIR/eval-api"
UI_DIR="$APP_DIR/eval-ui"

echo "🛠️ Starting Evaluation System Installation..."

# 1. Install Basic System Dependencies
echo "📦 Installing System Packages..."
sudo apt-get update
sudo apt-get install -y curl gnupg ca-certificates

# 1.1 Install Node.js 20 (LTS) from NodeSource
echo "🟢 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 1.2 Install Other Dependencies
sudo apt-get install -y default-jre nginx
sudo systemctl enable nginx

# 2. Install MongoDB (Official Repository - Ubuntu 22.04 Jammy)
if ! command -v mongod &> /dev/null; then
    echo "🍃 Installing MongoDB 7.0..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
       sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
       --dearmor --yes
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
       sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    sudo systemctl enable --now mongod
    echo "✅ MongoDB Installed and Started."
else
    echo "✅ MongoDB is already installed."
fi

# 3. Install PM2 Globally
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 4. Setup Directories
echo "📂 Creating storage and log directories..."
sudo mkdir -p "$APP_DIR/uploads" "$APP_DIR/extracted" "$APP_DIR/results" "$APP_DIR/logs"
sudo chown -R $USER:$USER "$APP_DIR"

# 5. Install Application Dependencies
echo "🔌 Installing API Dependencies..."
cd "$API_DIR"
npm install --production

echo "🔌 Installing UI Dependencies..."
cd "$UI_DIR"
npm install

echo "✅ Installation Complete!"
echo "   Run 'bash start-app.sh' to build and start the application."
