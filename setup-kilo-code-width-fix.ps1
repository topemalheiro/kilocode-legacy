# Setup Kilo Code Width Fix to Run on VS Code Startup
# This script creates a shortcut in the Windows startup folder

$scriptPath = "$PSScriptRoot\fix-kilo-code-width-v5.ps1"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "KiloCodeWidthFix.lnk"

# Check if script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: fix-kilo-code-width-v5.ps1 not found in the same directory" -ForegroundColor Red
    exit 1
}

# Remove existing shortcut if it exists
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
}

# Create a shortcut using WScript.Shell
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = "Kilo Code Width Fix"
$shortcut.Save()

Write-Host "Done! The width fix will now run automatically when you log in" -ForegroundColor Green
Write-Host "Shortcut created at: $shortcutPath" -ForegroundColor Cyan
