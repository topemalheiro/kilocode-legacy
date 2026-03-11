# Fix Kilo Code VS Code Extension - Full Width Messages
# More comprehensive fix that targets multiple width patterns
#
# Usage: powershell -ExecutionPolicy Bypass -File "fix-kilo-code-width-v5.ps1"

$extensionPath = "$env:USERPROFILE\.vscode\extensions"

# Check if extension path exists
if (-not (Test-Path $extensionPath)) {
    Write-Host "Error: Extension path not found: $extensionPath" -ForegroundColor Red
    exit 1
}

Write-Host "Looking for Kilo Code extensions in: $extensionPath" -ForegroundColor Cyan
$kiloExtensions = Get-ChildItem $extensionPath -Directory | Where-Object { $_.Name -like 'kilocode.kilo-code-*' }

if ($kiloExtensions.Count -eq 0) {
    Write-Host "No Kilo Code extensions found!" -ForegroundColor Yellow
    # List what IS there for debugging
    Write-Host "`nExtensions installed:" -ForegroundColor Gray
    Get-ChildItem $extensionPath -Directory | Select-Object -First 10 Name
}

$totalFixed = 0

foreach ($ext in $kiloExtensions) {
    Write-Host "Found extension: $($ext.Name)" -ForegroundColor Cyan
    
    # Find all CSS files in the extension
    $cssFiles = Get-ChildItem -Path $ext.FullName -Recurse -Include "*.css" -ErrorAction SilentlyContinue
    
    Write-Host "  Scanning $($cssFiles.Count) CSS files..." -ForegroundColor Gray
    
    foreach ($cssFile in $cssFiles) {
        $content = Get-Content $cssFile.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        # Debug: show which files have max-width
        if ($content -match 'max-width') {
            Write-Host "    Found max-width in: $($cssFile.Name)" -ForegroundColor Gray
        }
        
        $fileFixed = 0
        
        # Pattern 1: max-width with pixel values (680px, 800px, etc.) - but NOT already 100%
        if ($content -match 'max-width:\s*\d+px') {
            # Only fix if not already 100%
            if ($content -notmatch 'max-width:\s*100%') {
                $newContent = $content -replace 'max-width:\s*(\d+)px', 'max-width: 100%'
                if ($newContent -ne $content) {
                    Set-Content -Path $cssFile.FullName -Value $newContent -NoNewline
                    $fileFixed++
                }
            }
        }
        
        # Pattern 2: max-width with percentage values less than 100%
        if ($content -match 'max-width:\s*\d+%' -and $content -notmatch 'max-width:\s*100%') {
            $newContent = $content -replace 'max-width:\s*(\d+)%', 'max-width: 100%'
            if ($newContent -ne $content) {
                Set-Content -Path $cssFile.FullName -Value $newContent -NoNewline
                $fileFixed++
            }
        }
        
        # Pattern 3: width with margin: 0 auto (centered containers)
        if ($content -match 'width:\s*\d+px.*margin:.*auto') {
            $newContent = $content -replace 'width:\s*(\d+)px(?!.*width:\s*100%)', 'width: 100%'
            if ($newContent -ne $content) {
                Set-Content -Path $cssFile.FullName -Value $newContent -NoNewline
                $fileFixed++
            }
        }
        
        if ($fileFixed -gt 0) {
            Write-Host "  Fixed $fileFixed patterns in: $($cssFile.Name)" -ForegroundColor Green
            $totalFixed += $fileFixed
        }
    }
}

if ($totalFixed -gt 0) {
    Write-Host "`nTotal: Fixed $totalFixed patterns" -ForegroundColor Green
} else {
    # Check if extension exists at all
    if ($kiloExtensions.Count -eq 0) {
        Write-Host "`nNo Kilo Code extension found in $extensionPath" -ForegroundColor Yellow
    } else {
        Write-Host "`nNo width restrictions found - CSS may already be fixed in this version!" -ForegroundColor Green
        Write-Host "(This is good - the fix is now baked into the VSIX)" -ForegroundColor Cyan
    }
}

Write-Host "`nDone! Reload VS Code to see changes (Ctrl+Shift+P -> Developer: Reload Window)"
