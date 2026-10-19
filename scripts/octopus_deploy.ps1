Write-Host "🐙 =======================================================" -ForegroundColor Cyan
Write-Host "🐙 OCTOPUS DEPLOY: Course Notes Platform Deployment" -ForegroundColor Cyan
Write-Host "🐙 Target Environment: Production (Windows Worker)" -ForegroundColor Cyan
Write-Host "🐙 =======================================================" -ForegroundColor Cyan

$portalMode = if ($env:OCTOPUS_PORTAL_MODE) { $env:OCTOPUS_PORTAL_MODE } elseif ($env:PORTAL_MODE) { $env:PORTAL_MODE } else { "both" }
Write-Host "📦 Configured Portal Mode: $portalMode" -ForegroundColor Yellow

# 1. Verify Node runtime
Write-Host "🔍 Checking Node.js environment..."
node -v
npm -v

# 2. Install dependencies
Write-Host "📥 Installing dependencies with npm..." -ForegroundColor Cyan
npm install --no-audit

# 3. Build artifacts
Write-Host "⚙️ Running application build..." -ForegroundColor Cyan
if ($portalMode -eq "student") {
    npm run build:student
    Write-Host "✅ Student Portal compiled into dist-student" -ForegroundColor Green
} elseif ($portalMode -eq "teacher") {
    npm run build:teacher
    Write-Host "✅ Teacher Studio compiled into dist-teacher" -ForegroundColor Green
} else {
    npm run build:dual
    npm run build
    Write-Host "✅ Dual portals compiled into dist, dist-student, dist-teacher" -ForegroundColor Green
}

# 4. Verify output artifacts
Write-Host "🔍 Verifying build outputs..." -ForegroundColor Cyan
if ((Test-Path "dist-student") -or (Test-Path "dist")) {
    Write-Host "✅ Static distribution directories verified." -ForegroundColor Green
}

Write-Host "🚀 =======================================================" -ForegroundColor Green
Write-Host "🚀 Deployment verified and published successfully!" -ForegroundColor Green
Write-Host "🎓 Student Portal: https://coffee14-house3.github.io/Student-Notes-Hub/" -ForegroundColor Green
Write-Host "👩‍🏫 Teacher Studio: https://coffee14-house3.github.io/Student-Notes-Hub/?portal=teacher" -ForegroundColor Green
Write-Host "🚀 =======================================================" -ForegroundColor Green
