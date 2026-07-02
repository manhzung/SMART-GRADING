#!/bin/bash
# ============================================================
# SMART GRADING - Production Startup Script
# Starts Xvfb and Node.js server
# ============================================================

set -e

echo "[STARTUP] Starting SMART GRADING server..."

# Start Xvfb in background for AMC
echo "[STARTUP] Starting Xvfb virtual display..."
Xvfb :99 -screen 0 1024x768x24 &
XVFB_PID=$!
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 2

# Verify DISPLAY
echo "[STARTUP] DISPLAY=$DISPLAY"

# Start the Node.js server
echo "[STARTUP] Starting Node.js server..."
exec node src/index.js
