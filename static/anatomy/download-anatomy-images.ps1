# Download High-Quality Anatomy Images
# Run this script from the anatomy folder or it will auto-navigate

Write-Host "Downloading High-Quality Anatomy SVG Images..." -ForegroundColor Cyan
Write-Host ""

# Get script directory and navigate to it
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

# Create anatomy folder if it doesn't exist
if (-not (Test-Path ".")) {
    New-Item -ItemType Directory -Force -Path "."
}

# Define download list with URLs and filenames
$downloads = @(
    @{
        Name = "Bones (Front View)"
        Url = "https://upload.wikimedia.org/wikipedia/commons/c/ca/Human_skeleton_front_en.svg"
        File = "bones_front.svg"
    },
    @{
        Name = "Bones (Back View)"
        Url = "https://upload.wikimedia.org/wikipedia/commons/4/4e/Human_skeleton_back_en.svg"
        File = "bones_back.svg"
    },
    @{
        Name = "Muscles (Combined View)"
        Url = "https://upload.wikimedia.org/wikipedia/commons/e/ef/Muscles_front_and_back.svg"
        File = "muscles_combined.svg"
    }
)

$successCount = 0
$failCount = 0

foreach ($item in $downloads) {
    Write-Host "Downloading: $($item.Name)..." -ForegroundColor Yellow
    
    try {
        # Check if file already exists
        if (Test-Path $item.File) {
            Write-Host "  File already exists: $($item.File)" -ForegroundColor DarkYellow
            $overwrite = Read-Host "  Overwrite? (y/N)"
            if ($overwrite -ne "y" -and $overwrite -ne "Y") {
                Write-Host "  Skipped." -ForegroundColor Gray
                continue
            }
        }
        
        # Download with progress bar
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $item.Url -OutFile $item.File -ErrorAction Stop
        $ProgressPreference = 'Continue'
        
        # Get file size
        $fileInfo = Get-Item $item.File
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        
        Write-Host "  SUCCESS: Downloaded $($item.File) - Size: $sizeKB KB" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Download Summary:" -ForegroundColor Cyan
Write-Host "  Success: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "Images downloaded successfully!" -ForegroundColor Green
    Write-Host "  Location: $(Get-Location)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Refresh your browser" -ForegroundColor White
    Write-Host "  2. Clear cache if needed (Ctrl+Shift+R)" -ForegroundColor White
    Write-Host "  3. Open the Anatomy Explorer" -ForegroundColor White
    Write-Host "  4. Enjoy high-quality anatomy images!" -ForegroundColor White
} else {
    Write-Host "No images were downloaded." -ForegroundColor Yellow
    Write-Host "  Check your internet connection and try again." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
