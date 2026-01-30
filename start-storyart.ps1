<#
  StoryArt Development START Script
  - Cleanup -> start -> health-gate -> fresh browser profile
  - Enhanced process tree management and health checks
  - Optimized for StoryArt React/Vite application

  Starts:
  - Frontend (Vite dev server) on port 3000
  - Redis Session API Server on port 7802 (for Browse & Restore sessions)

  Usage:
    .\start-storyart.ps1 [-UseEdge] [-NoBrowser] [-NoBackend] [-Help]
#>

[CmdletBinding()]
param(
  [switch]$UseEdge,
  [switch]$NoBrowser,
  [switch]$NoBackend,
  [switch]$Help
)

if ($Help) {
  Write-Host "StoryArt Development START Script" -ForegroundColor Green
  Write-Host "Options:"
  Write-Host "  -UseEdge         Open Microsoft Edge instead of Chrome"
  Write-Host "  -NoBrowser       Do not launch a browser"
  Write-Host "  -NoBackend       Skip starting Redis Session API server (port 7802)"
  Write-Host "  -Help            Show this help"
  Write-Host ""
  Write-Host "What it does:"
  Write-Host "  1) Clean shutdown: kill process trees on ports 3000 and 7802"
  Write-Host "  2) Start Redis Session API server (port 7802) for Browse & Restore"
  Write-Host "  3) Start StoryArt React/Vite dev server (port 3000)"
  Write-Host "  4) Open app in a fresh, throwaway browser profile"
  Write-Host ""
  Write-Host "Storage:"
  Write-Host "  - Sessions: Redis (via port 7802) with localStorage fallback"
  Write-Host "  - Results:  PostgreSQL (via StoryTeller API) - permanent storage"
  exit 0
}

# =========================
# CONFIG — EDIT THESE
# =========================
$Frontend = @{
  Name      = 'StoryArt Dev Server'
  Port      = 3000
  WorkDir   = 'E:\REPOS\StoryArt'                    # <-- StoryArt project path
  StartCmd  = 'npm run dev'
  HealthUrl = 'http://localhost:3000'                   # vite responds at /
}

# Redis Session API Server - provides Browse & Restore session functionality
$Backend = @{
  Name      = 'Redis Session API Server'
  Port      = 7802
  WorkDir   = 'E:\REPOS\StoryArt'
  StartCmd  = 'npm run dev:server'
  HealthUrl = 'http://localhost:7802/health'
}

$OpenUrl = 'http://localhost:3000'

# =========================
# Helpers
# =========================
function Get-ChildPids {
  param([int]$ParentPid)
  $children = @()
  $queue = New-Object System.Collections.Generic.Queue[int]
  $queue.Enqueue($ParentPid)
  while ($queue.Count -gt 0) {
    $processId = $queue.Dequeue()
    try {
      $procs = Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId"
      foreach ($p in $procs) {
        $children += $p.ProcessId
        $queue.Enqueue($p.ProcessId)
      }
    }
    catch {
      # ignore
    }
  }
  return $children | Select-Object -Unique
}

function Stop-ProcessOnPort {
  param([int]$Port, [string]$ServiceName)

  Write-Host ("Clearing port {0} ({1})..." -f $Port, $ServiceName) -ForegroundColor Yellow
  $owners = @()
  try {
    $owners = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  }
  catch {
    $owners = @()
  }

  if (-not $owners -or $owners.Count -eq 0) {
    Write-Host "  - Already free" -ForegroundColor Green
    return
  }

  foreach ($processId in $owners) {
    # Skip system processes (PID 0-4)
    if ($processId -le 4) {
      continue
    }
    
    try {
      $proc = Get-Process -Id $processId -ErrorAction Stop
      
      # Skip system processes
      $systemProcesses = @('Idle', 'System', 'smss', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'svchost', 'com.docker.backend', 'docker', 'dockerd', 'vpnkit')
      if ($systemProcesses -contains $proc.ProcessName) {
        continue
      }
      
      $tree = (Get-ChildPids -ParentPid $processId) + $processId | Sort-Object -Descending -Unique | Where-Object { $_ -gt 4 }
      foreach ($cpid in $tree) {
        $p = Get-Process -Id $cpid -ErrorAction SilentlyContinue
        if ($p) {
          # Skip system processes
          if ($systemProcesses -contains $p.ProcessName) {
            continue
          }
          Write-Host ("  - Killing {0} (PID {1})" -f $p.ProcessName, $cpid) -ForegroundColor Red
          Stop-Process -Id $cpid -Force -ErrorAction SilentlyContinue
        }
      }
    }
    catch {
      # ignore one-off races
    }
  }

  $deadline = (Get-Date).AddSeconds(10)
  do {
    Start-Sleep -Milliseconds 250
    $still = $null
    try { $still = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue } catch { $still = $null }
  } while ($still -and (Get-Date) -lt $deadline)

  if (-not $still) {
    Write-Host "  - Freed" -ForegroundColor Green
  }
  else {
    Write-Host ("  - WARNING: port {0} still busy" -f $Port) -ForegroundColor Yellow
  }
}

function Wait-HttpReady {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60,
    [int]$DelayMs = 1000
  )
  Write-Host ("Waiting for: {0}" -f $Url) -ForegroundColor Yellow
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $attempt = 0
  while ((Get-Date) -lt $deadline) {
    $attempt++
    try {
      # Use Test-NetConnection first to avoid Invoke-WebRequest resource issues
      $uri = [System.Uri]$Url
      $tcpTest = Test-NetConnection -ComputerName $uri.Host -Port $uri.Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue

      if ($tcpTest.TcpTestSucceeded) {
        # Port is open, now try HTTP request with disposal
        $response = $null
        try {
          $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
          if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            Write-Host ("  Ready ({0}) after {1} attempts" -f $response.StatusCode, $attempt) -ForegroundColor Green
            return $true
          }
        }
        finally {
          if ($response) { $response = $null }
          [System.GC]::Collect()
        }
      }
    }
    catch {
      # not ready yet - this is expected during startup
    }
    Start-Sleep -Milliseconds $DelayMs
  }
  Write-Host ("  NOT ready (timeout after {0}s, {1} attempts)" -f $TimeoutSeconds, $attempt) -ForegroundColor Yellow
  return $false
}

function Open-BrowserTempProfile {
  param([string]$Url, [switch]$Edge)
  $tempProfile = Join-Path $env:TEMP ("storyart_profile_" + [guid]::NewGuid())
  try { New-Item -ItemType Directory -Path $tempProfile | Out-Null } catch { }

  if ($Edge) {
    Write-Host ("Opening Edge (temp profile): {0}" -f $Url) -ForegroundColor Cyan
    Start-Process -FilePath "msedge.exe" -ArgumentList @(
      "--user-data-dir=$tempProfile",
      "--no-first-run",
      "--disable-extensions",
      "$Url"
    )
  }
  else {
    Write-Host ("Opening Chrome (temp profile): {0}" -f $Url) -ForegroundColor Cyan
    Start-Process -FilePath "chrome.exe" -ArgumentList @(
      "--user-data-dir=$tempProfile",
      "--no-first-run",
      "--disable-extensions",
      "$Url"
    )
  }
}

function Ensure-NodeModules {
  param([string]$Dir)
  $nm = Join-Path $Dir 'node_modules'
  if (-not (Test-Path $nm)) {
    Write-Host ("Installing StoryArt dependencies in {0}..." -f $Dir) -ForegroundColor Yellow
    Push-Location $Dir
    try { npm install | Out-Null } finally { Pop-Location }
  }
  else {
    Write-Host "StoryArt dependencies present" -ForegroundColor Green
  }
}

# Enhanced function to kill ALL StoryArt-related processes
function Stop-StoryArtProcesses {
  Write-Host "Killing all StoryArt-related processes..." -ForegroundColor Yellow
  
  # Get all Node.js processes related to StoryArt
  $nodeProcesses = Get-WmiObject Win32_Process | Where-Object { 
    $_.Name -eq "node.exe" -and (
      $_.CommandLine -like "*storyart*" -or 
      $_.CommandLine -like "*StoryArt*" -or
      $_.CommandLine -like "*StoryArt*" -or
      $_.CommandLine -like "*StoryArt*" -or
      $_.CommandLine -like "*storyart*"
    )
  }
  
  # Also get any processes using StoryArt ports
  $portProcesses = @()
  try {
    $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    $port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    $portProcesses = @($port3000, $port5173) | Where-Object { $_ -ne $null -and $_ -gt 4 } | Select-Object -Unique
  }
  catch {
    # ignore
  }
  
  $allProcesses = @($nodeProcesses.ProcessId) + $portProcesses | Select-Object -Unique | Where-Object { $_ -ne $null -and $_ -gt 4 }
  
  foreach ($processId in $allProcesses) {
    # Skip system processes (PID 0, 4, etc.)
    if ($processId -le 4) {
      continue
    }
    
    try {
      $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
      if ($proc) {
        # Skip system processes like Idle, System, etc.
        $systemProcesses = @('Idle', 'System', 'smss', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'svchost', 'com.docker.backend', 'docker', 'dockerd', 'vpnkit')
        if ($systemProcesses -contains $proc.ProcessName) {
          continue
        }
        
        Write-Host "  Killing process $($proc.ProcessName) (PID $processId)" -ForegroundColor Red
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      }
    }
    catch {
      Write-Host "    Could not kill process $processId" -ForegroundColor Yellow
    }
  }
  
  if ($allProcesses.Count -eq 0) {
    Write-Host "  No StoryArt processes found" -ForegroundColor Green
  }
  else {
    Write-Host "  Killed $($allProcesses.Count) processes" -ForegroundColor Green
  }
}

# =========================
# 1) CLEANUP
# =========================
Write-Host ("=" * 64) -ForegroundColor DarkCyan
Write-Host "StoryArt Dev: Cleanup -> Start" -ForegroundColor Yellow
Write-Host ("=" * 64) -ForegroundColor DarkCyan

# Enhanced cleanup: Kill all StoryArt processes first
Stop-StoryArtProcesses

# Clear frontend port
Stop-ProcessOnPort -Port $Frontend.Port -ServiceName $Frontend.Name

# Clear backend port (if not skipping backend)
if (-not $NoBackend) {
  Stop-ProcessOnPort -Port $Backend.Port -ServiceName $Backend.Name
}

# Give processes extra time to fully terminate
Write-Host "Waiting for processes to fully terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# =========================
# 2) FRONTEND deps (once)
# =========================
Ensure-NodeModules -Dir $Frontend.WorkDir

# =========================
# 3) START BACKEND (Redis Session API)
# =========================
if (-not $NoBackend) {
  Write-Host "`nStarting Redis Session API Server (port $($Backend.Port))..." -ForegroundColor Green
  $backendArgs = @("-NoExit", "-Command", $Backend.StartCmd)
  try {
    Start-Process -FilePath "powershell" -ArgumentList $backendArgs -WorkingDirectory $Backend.WorkDir | Out-Null
  }
  catch {
    Write-Host "Failed to start Redis Session API server." -ForegroundColor Red
  }
  
  # Wait for backend to be ready
  $backendReady = Wait-HttpReady -Url $Backend.HealthUrl -TimeoutSeconds 30
  if (-not $backendReady) {
    Write-Host "WARNING: Redis Session API may not be ready. Browse & Restore may not work." -ForegroundColor Yellow
  }
}
else {
  Write-Host "`nSkipping Redis Session API Server (-NoBackend)" -ForegroundColor Yellow
}

# =========================
# 4) START FRONTEND
# =========================
Write-Host "`nStarting StoryArt frontend (port $($Frontend.Port))..." -ForegroundColor Green
$frontendArgs = @("-NoExit", "-Command", $Frontend.StartCmd)
try {
  Start-Process -FilePath "powershell" -ArgumentList $frontendArgs -WorkingDirectory $Frontend.WorkDir | Out-Null
}
catch {
  Write-Host "Failed to start StoryArt frontend process." -ForegroundColor Red
}

[void](Wait-HttpReady -Url $Frontend.HealthUrl -TimeoutSeconds 90)

# =========================
# 5) OPEN BROWSER (fresh profile)
# =========================
if (-not $NoBrowser) {
  Open-BrowserTempProfile -Url $OpenUrl -Edge:$UseEdge
}
else {
  Write-Host "Browser launch skipped (-NoBrowser)" -ForegroundColor Yellow
}

Write-Host "`nStoryArt development environment started:" -ForegroundColor Green
Write-Host ("  Frontend: {0}" -f $OpenUrl) -ForegroundColor Cyan
if (-not $NoBackend) {
  Write-Host ("  Backend:  http://localhost:{0}" -f $Backend.Port) -ForegroundColor Cyan
  Write-Host "  Sessions: Redis (Browse & Restore enabled)" -ForegroundColor Cyan
}
else {
  Write-Host "  Sessions: localStorage only (Browse & Restore disabled)" -ForegroundColor Yellow
}
Write-Host "  Results:  PostgreSQL (via StoryTeller API)" -ForegroundColor Cyan
Write-Host ("=" * 64) -ForegroundColor DarkCyan

Write-Host "`nDevelopment Tips:" -ForegroundColor Yellow
Write-Host "  - Vite dev server will auto-reload on file changes" -ForegroundColor White
if (-not $NoBackend) {
  Write-Host "  - Browse & Restore retrieves sessions from Redis" -ForegroundColor White
}
Write-Host "  - Use Ctrl+C in the terminal windows to stop servers" -ForegroundColor White
Write-Host "  - Fresh browser profile prevents cache issues" -ForegroundColor White

Write-Host "`nStoryArt Features:" -ForegroundColor Yellow
Write-Host "  - Script Analysis with Gemini AI" -ForegroundColor White
Write-Host "  - Beat Detection and Reuse Logic" -ForegroundColor White
Write-Host "  - SwarmUI Prompt Generation" -ForegroundColor White
Write-Host "  - Professional Storyboard Pipeline" -ForegroundColor White

Write-Host "`nHappy storytelling!" -ForegroundColor Green
