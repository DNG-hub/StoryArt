# Monitor StoryArt Server Logs
# This script helps capture and display server logs

Write-Host "`n🔍 StoryArt Server Log Monitor`n" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor DarkCyan

# Check if server is running
$serverRunning = $false
try {
    $health = Invoke-WebRequest -Uri "http://localhost:7802/health" -UseBasicParsing -TimeoutSec 2
    if ($health.StatusCode -eq 200) {
        $serverRunning = $true
        Write-Host "✅ Server is running on port 7802" -ForegroundColor Green
        Write-Host "   Status: $($health.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Server not responding on port 7802" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Yellow
}

# Check frontend
$frontendRunning = $false
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
    if ($frontend.StatusCode -eq 200) {
        $frontendRunning = $true
        Write-Host "✅ Frontend is running on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Frontend not responding on port 3000" -ForegroundColor Yellow
}

Write-Host "`n" + ("=" * 60) -ForegroundColor DarkCyan
Write-Host "`n📋 Server Status Summary:" -ForegroundColor Cyan
Write-Host "   Backend (port 7802): $(if ($serverRunning) { '✅ Running' } else { '❌ Not Running' })"
Write-Host "   Frontend (port 3000): $(if ($frontendRunning) { '✅ Running' } else { '⚠️  Not Running' })"

Write-Host "`n📝 To see server logs:" -ForegroundColor Yellow
Write-Host "   1. Check the terminal window where you ran 'npm run dev:server'"
Write-Host "   2. Look for error messages in red"
Write-Host "   3. Check for Redis connection messages"
Write-Host "   4. Look for any stack traces or error details"

Write-Host "`n🔍 Checking for common issues..." -ForegroundColor Cyan

# Check Redis connection
try {
    $redisTest = Invoke-WebRequest -Uri "http://localhost:7802/health" -UseBasicParsing -TimeoutSec 2
    $healthData = $redisTest.Content | ConvertFrom-Json
    if ($healthData.redis -eq "connected") {
        Write-Host "   ✅ Redis: Connected" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Redis: $($healthData.redis)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Cannot check Redis status" -ForegroundColor Red
}

# Check for port conflicts
$port7802 = Get-NetTCPConnection -LocalPort 7802 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port7802) {
    $proc = Get-Process -Id $port7802.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "   Port 7802: Used by $($proc.ProcessName) (PID: $($port7802.OwningProcess))" -ForegroundColor Gray
}

if ($port3000) {
    $proc = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "   Port 3000: Used by $($proc.ProcessName) (PID: $($port3000.OwningProcess))" -ForegroundColor Gray
}

Write-Host "`n" + ("=" * 60) -ForegroundColor DarkCyan
Write-Host "`n✅ Monitoring ready. When you trigger the error, check:" -ForegroundColor Green
Write-Host "   1. The terminal where 'npm run dev:server' is running"
Write-Host "   2. Browser console (F12) for frontend errors"
Write-Host "   3. Network tab for API errors"
Write-Host "`nPress any key when ready to trigger the error, or Ctrl+C to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

