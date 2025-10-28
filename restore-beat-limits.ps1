# StoryArt Beat Limit Restoration Script
# This script restores the original 4-6 beat limit system
# Run this if the unlimited beat modification proves unworkable

Write-Host "🔄 Restoring StoryArt Beat Analysis Services to Original 4-6 Beat Limit..." -ForegroundColor Yellow

# Restore geminiService.ts
if (Test-Path "services/geminiService.ts.backup") {
    Copy-Item "services/geminiService.ts.backup" "services/geminiService.ts" -Force
    Write-Host "✅ Restored services/geminiService.ts" -ForegroundColor Green
} else {
    Write-Host "❌ Backup file services/geminiService.ts.backup not found!" -ForegroundColor Red
}

# Restore enhancedAnalysisService.ts
if (Test-Path "services/enhancedAnalysisService.ts.backup") {
    Copy-Item "services/enhancedAnalysisService.ts.backup" "services/enhancedAnalysisService.ts" -Force
    Write-Host "✅ Restored services/enhancedAnalysisService.ts" -ForegroundColor Green
} else {
    Write-Host "❌ Backup file services/enhancedAnalysisService.ts.backup not found!" -ForegroundColor Red
}

# Restore qwenService.ts
if (Test-Path "services/qwenService.ts.backup") {
    Copy-Item "services/qwenService.ts.backup" "services/qwenService.ts" -Force
    Write-Host "✅ Restored services/qwenService.ts" -ForegroundColor Green
} else {
    Write-Host "❌ Backup file services/qwenService.ts.backup not found!" -ForegroundColor Red
}

Write-Host "🎯 Beat limit restoration complete!" -ForegroundColor Cyan
Write-Host "The system is now back to producing 4-6 beats per scene." -ForegroundColor White
