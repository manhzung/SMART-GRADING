#!/bin/bash
# ============================================================
# SMART GRADING - Development Startup Script
# Starts Xvfb and Node.js with nodemon (hot reload)
# ============================================================

set -e

echo "[STARTUP-DEV] Starting SMART GRADING server (DEV MODE)..."

echo "[STARTUP-DEV] Starting Xvfb virtual display..."
Xvfb :99 -screen 0 1024x768x24 &
XVFB_PID=$!
export DISPLAY=:99

sleep 2

echo "[STARTUP-DEV] DISPLAY=$DISPLAY"
echo "[STARTUP-DEV] Starting Node.js with nodemon (hot reload)..."

exec npx nodemon --legacy-watch src/index.js