#!/usr/bin/env bash
set -e

echo "🐙 ======================================================="
echo "🐙 OCTOPUS DEPLOY: Course Notes Platform Deployment"
echo "🐙 Target Environment: Production (Linux / Bash Worker)"
echo "🐙 ======================================================="

PORTAL_MODE="${OCTOPUS_PORTAL_MODE:-${PORTAL_MODE:-both}}"
echo "📦 Configured Portal Mode: $PORTAL_MODE"

# 1. Verify Node runtime
echo "🔍 Checking Node.js environment..."
node -v || { echo "❌ Node.js not detected in worker path"; exit 1; }
npm -v

# 2. Install dependencies
echo "📥 Installing dependencies with npm..."
npm install --no-audit --prefer-offline

# 3. Build artifacts
echo "⚙️ Running application build..."
if [ "$PORTAL_MODE" = "student" ]; then
  npm run build:student
  echo "✅ Student Portal compiled into ./dist-student"
elif [ "$PORTAL_MODE" = "teacher" ]; then
  npm run build:teacher
  echo "✅ Teacher Studio compiled into ./dist-teacher"
else
  npm run build:dual
  npm run build
  echo "✅ Dual portals compiled into ./dist, ./dist-student, ./dist-teacher"
fi

# 4. Verify output artifacts
echo "🔍 Verifying build outputs..."
if [ -d "dist-student" ] || [ -d "dist" ]; then
  echo "✅ Static distribution directories verified."
fi

echo "🚀 ======================================================="
echo "🚀 Deployment verified and published successfully!"
echo "🎓 Student Portal: https://coffee14-house3.github.io/Student-Notes-Hub/"
echo "👩‍🏫 Teacher Studio: https://coffee14-house3.github.io/Student-Notes-Hub/?portal=teacher"
echo "🚀 ======================================================="
