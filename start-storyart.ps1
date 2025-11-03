<# 
  StoryArt Development START Script
  - Cleanup -> start -> health-gate -> fresh browser profile
  - Enhanced process tree management and health checks
  - Optimized for StoryArt React/Vite application

  Usage:
    .\start-storyart.ps1 [-UseEdge] [-NoBrowser] [-Help]
#>

[CmdletBinding()]
param(
  [switch]$UseEdge,
  [switch]$NoBrowser,
  [switch]$Help
)

if ($Help) {
  Write-Host "StoryArt Development START Script" -ForegroundColor Green
  Write-Host "Options:"
  Write-Host "  -UseEdge         Open Microsoft Edge instead of Chrome"
  Write-Host "  -NoBrowser       Do not launch a browser"
  Write-Host "  -Help            Show this help"
  Write-Host ""
  Write-Host "What it does:"
  Write-Host "  1) Clean shutdown: kill process trees on ports 3000/5173; wait until ports are free"
  Write-Host "  2) Start StoryArt React/Vite dev server + wait for readiness"
  Write-Host "  3) Open app in a fresh, throwaway browser profile"
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
    } catch {
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
  } catch {
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
      $systemProcesses = @('Idle', 'System', 'smss', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'svchost')
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
    } catch {
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
  } else {
    Write-Host ("  - WARNING: port {0} still busy" -f $Port) -ForegroundColor Yellow
  }
}

function Wait-HttpReady {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60,
    [int]$DelayMs = 500
  )
  Write-Host ("Waiting for: {0}" -f $Url) -ForegroundColor Yellow
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
        Write-Host ("  Ready ({0})" -f $r.StatusCode) -ForegroundColor Green
        return $true
      }
    } catch {
      # not ready yet
    }
    Start-Sleep -Milliseconds $DelayMs
  }
  Write-Host ("  NOT ready (timeout after {0}s)" -f $TimeoutSeconds) -ForegroundColor Yellow
  return $false
}

function Open-BrowserTempProfile {
  param([string]$Url, [switch]$Edge)
  $tempProfile = Join-Path $env:TEMP ("storyart_profile_" + [guid]::NewGuid())
  try { New-Item -ItemType Directory -Path $tempProfile | Out-Null } catch { }

  if ($Edge) {
    Write-Host ("Opening Edge (temp profile): {0}" -f $Url) -ForegroundColor Cyan
    Start-Process "msedge.exe" --% --user-data-dir="$tempProfile" --no-first-run --disable-extensions "$Url"
  } else {
    Write-Host ("Opening Chrome (temp profile): {0}" -f $Url) -ForegroundColor Cyan
    Start-Process "chrome.exe" --% --user-data-dir="$tempProfile" --no-first-run --disable-extensions "$Url"
  }
}

function Ensure-NodeModules {
  param([string]$Dir)
  $nm = Join-Path $Dir 'node_modules'
  if (-not (Test-Path $nm)) {
    Write-Host ("Installing StoryArt dependencies in {0}..." -f $Dir) -ForegroundColor Yellow
    Push-Location $Dir
    try { npm install | Out-Null } finally { Pop-Location }
  } else {
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
      $_.CommandLine -like "*vite*" -or
      $_.CommandLine -like "*npm*" -or
      $_.CommandLine -like "*dev*"
    )
  }
  
  # Also get any processes using StoryArt ports
  $portProcesses = @()
  try {
    $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    $port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    $portProcesses = @($port3000, $port5173) | Where-Object { $_ -ne $null -and $_ -gt 4 } | Select-Object -Unique
  } catch {
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
        $systemProcesses = @('Idle', 'System', 'smss', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'svchost')
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
Write-Host ("="*64) -ForegroundColor DarkCyan
Write-Host "StoryArt Dev: Cleanup -> Start" -ForegroundColor Yellow
Write-Host ("="*64) -ForegroundColor DarkCyan

# Enhanced cleanup: Kill all StoryArt processes first
Stop-StoryArtProcesses

# Then clear specific ports with process tree management
Stop-ProcessOnPort -Port $Frontend.Port -ServiceName $Frontend.Name
Stop-ProcessOnPort -Port $Backend.Port -ServiceName $Backend.Name

# Give processes extra time to fully terminate
Write-Host "Waiting for processes to fully terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# =========================
# 2) FRONTEND deps (once)
# =========================
Ensure-NodeModules -Dir $Frontend.WorkDir

# =========================
# 2.5) START BACKEND SERVER
# =========================
Write-Host "`nStarting Redis Session API server…" -ForegroundColor Green
$backendArgs = @("-NoExit", "-Command", $Backend.StartCmd)
try {
  Start-Process -FilePath "powershell" -ArgumentList $backendArgs -WorkingDirectory $Backend.WorkDir | Out-Null
  Write-Host "Waiting for Redis API server to be ready..." -ForegroundColor Yellow
  Start-Sleep -Seconds 2
  [void](Wait-HttpReady -Url $Backend.HealthUrl -TimeoutSeconds 10)
} catch {
  Write-Host "Failed to start Redis API server (will use localStorage fallback)." -ForegroundColor Yellow
}

# =========================
# 3) START FRONTEND
# =========================
Write-Host "`nStarting StoryArt frontend…" -ForegroundColor Green
$frontendArgs = @("-NoExit", "-Command", $Frontend.StartCmd)
try {
  Start-Process -FilePath "powershell" -ArgumentList $frontendArgs -WorkingDirectory $Frontend.WorkDir | Out-Null
} catch {
  Write-Host "Failed to start StoryArt frontend process." -ForegroundColor Red
}

[void](Wait-HttpReady -Url $Frontend.HealthUrl -TimeoutSeconds 90)

# =========================
# 4) OPEN BROWSER (fresh profile)
# =========================
if (-not $NoBrowser) {
  Open-BrowserTempProfile -Url $OpenUrl -Edge:$UseEdge
} else {
  Write-Host "Browser launch skipped (-NoBrowser)" -ForegroundColor Yellow
}

Write-Host "`nStoryArt development environment started:" -ForegroundColor Green
Write-Host ("  Frontend: {0}" -f $OpenUrl) -ForegroundColor Cyan
Write-Host ("  Backend API: http://localhost:{0}" -f $Backend.Port) -ForegroundColor Cyan
Write-Host ("="*64) -ForegroundColor DarkCyan

Write-Host "`nDevelopment Tips:" -ForegroundColor Yellow
Write-Host "  - Vite dev server will auto-reload on file changes" -ForegroundColor White
Write-Host "  - Check the terminal window for any startup errors" -ForegroundColor White
Write-Host "  - Use Ctrl+C in the terminal to stop the server" -ForegroundColor White
Write-Host "  - Fresh browser profile prevents cache issues" -ForegroundColor White

Write-Host "`nStoryArt Features:" -ForegroundColor Yellow
Write-Host "  - Script Analysis with Gemini AI" -ForegroundColor White
Write-Host "  - Beat Detection and Reuse Logic" -ForegroundColor White
Write-Host "  - SwarmUI Prompt Generation" -ForegroundColor White
Write-Host "  - Professional Storyboard Pipeline" -ForegroundColor White

Write-Host "`nHappy storytelling!" -ForegroundColor Green
