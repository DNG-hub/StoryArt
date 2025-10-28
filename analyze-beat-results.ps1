# StoryArt Beat Analysis Test Script
# This script helps analyze the results of the unlimited beat modification

Write-Host "🧪 StoryArt Beat Analysis Test Results" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to analyze beat counts and image decisions
function Analyze-Beats {
    param($AnalysisData)
    
    $totalBeats = 0
    $newImages = 0
    $reuseImages = 0
    $noImages = 0
    $scenes = @()
    
    foreach ($scene in $AnalysisData.scenes) {
        $sceneBeats = $scene.beats.Count
        $totalBeats += $sceneBeats
        
        $sceneNewImages = 0
        $sceneReuseImages = 0
        $sceneNoImages = 0
        
        foreach ($beat in $scene.beats) {
            switch ($beat.imageDecision.type) {
                "NEW_IMAGE" { 
                    $newImages++
                    $sceneNewImages++
                }
                "REUSE_IMAGE" { 
                    $reuseImages++
                    $sceneReuseImages++
                }
                "NO_IMAGE" { 
                    $noImages++
                    $sceneNoImages++
                }
            }
        }
        
        $scenes += [PSCustomObject]@{
            SceneNumber = $scene.sceneNumber
            SceneTitle = $scene.title
            BeatCount = $sceneBeats
            NewImages = $sceneNewImages
            ReuseImages = $sceneReuseImages
            NoImages = $sceneNoImages
        }
    }
    
    Write-Host "`n📊 OVERALL STATISTICS" -ForegroundColor Yellow
    Write-Host "Total Beats: $totalBeats" -ForegroundColor White
    Write-Host "New Images: $newImages ($([math]::Round(($newImages/$totalBeats)*100, 1))%)" -ForegroundColor Green
    Write-Host "Reuse Images: $reuseImages ($([math]::Round(($reuseImages/$totalBeats)*100, 1))%)" -ForegroundColor Blue
    Write-Host "No Images: $noImages ($([math]::Round(($noImages/$totalBeats)*100, 1))%)" -ForegroundColor Gray
    
    Write-Host "`n🎬 SCENE BREAKDOWN" -ForegroundColor Yellow
    foreach ($scene in $scenes) {
        Write-Host "Scene $($scene.SceneNumber): $($scene.SceneTitle)" -ForegroundColor Cyan
        Write-Host "  Beats: $($scene.BeatCount) | New: $($scene.NewImages) | Reuse: $($scene.ReuseImages) | None: $($scene.NoImages)" -ForegroundColor White
    }
    
    Write-Host "`n💡 ANALYSIS NOTES" -ForegroundColor Yellow
    if ($totalBeats -gt 20) {
        Write-Host "⚠️  High beat count detected - this may impact performance" -ForegroundColor Red
    } elseif ($totalBeats -gt 12) {
        Write-Host "✅ Moderate beat count - good granularity" -ForegroundColor Yellow
    } else {
        Write-Host "ℹ️  Low beat count - similar to original 4-6 limit" -ForegroundColor Green
    }
    
    $reuseRate = ($reuseImages / $totalBeats) * 100
    if ($reuseRate -lt 20) {
        Write-Host "⚠️  Low reuse rate - consider optimizing image decisions" -ForegroundColor Red
    } elseif ($reuseRate -lt 40) {
        Write-Host "✅ Good reuse rate - efficient image usage" -ForegroundColor Green
    } else {
        Write-Host "🎯 Excellent reuse rate - very efficient!" -ForegroundColor Green
    }
}

Write-Host "`nTo use this script:" -ForegroundColor White
Write-Host "1. Run your script analysis in StoryArt" -ForegroundColor White
Write-Host "2. Copy the analysis JSON from the results panel" -ForegroundColor White
Write-Host "3. Run: `$analysis = Get-Clipboard | ConvertFrom-Json" -ForegroundColor White
Write-Host "4. Run: Analyze-Beats `$analysis" -ForegroundColor White
Write-Host "`nOr paste your analysis JSON directly when prompted:" -ForegroundColor White

# Interactive mode
$jsonInput = Read-Host "`nPaste your analysis JSON here (or press Enter to skip)"
if ($jsonInput) {
    try {
        $analysis = $jsonInput | ConvertFrom-Json
        Analyze-Beats $analysis
    } catch {
        Write-Host "❌ Invalid JSON format. Please try again." -ForegroundColor Red
    }
}
