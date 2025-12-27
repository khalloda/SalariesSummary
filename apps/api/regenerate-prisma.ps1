# Regenerate Prisma Client
# This script ensures the Prisma client is properly regenerated

Write-Host "Regenerating Prisma Client..." -ForegroundColor Yellow
Write-Host ""

# Change to API directory
Set-Location $PSScriptRoot

# Step 1: Try to remove the old Prisma client folder
$prismaClientPath = Join-Path $PSScriptRoot "node_modules\.prisma"
if (Test-Path $prismaClientPath) {
    Write-Host "Removing old Prisma client files..." -ForegroundColor Cyan
    try {
        # Try to remove files individually first
        Get-ChildItem -Path $prismaClientPath -Recurse -File | ForEach-Object {
            try {
                Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "  Could not remove: $($_.Name)" -ForegroundColor Yellow
            }
        }
        # Then remove directories
        Get-ChildItem -Path $prismaClientPath -Recurse -Directory | Sort-Object -Descending | ForEach-Object {
            try {
                Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "  Could not remove directory: $($_.Name)" -ForegroundColor Yellow
            }
        }
        # Finally remove the main folder
        Remove-Item -Path $prismaClientPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Old Prisma client files removed." -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not fully remove Prisma client files: $_" -ForegroundColor Yellow
        Write-Host "You may need to:" -ForegroundColor Yellow
        Write-Host "  1. Close Cursor/VS Code" -ForegroundColor Yellow
        Write-Host "  2. Stop all Node processes" -ForegroundColor Yellow
        Write-Host "  3. Manually delete: $prismaClientPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "No existing Prisma client folder found." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Prisma client regenerated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now restart the server." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error regenerating Prisma client." -ForegroundColor Red
    Write-Host ""
    Write-Host "Try these steps:" -ForegroundColor Yellow
    Write-Host "  1. Stop the API server (Ctrl+C)" -ForegroundColor Yellow
    Write-Host "  2. Close Cursor/VS Code completely" -ForegroundColor Yellow
    Write-Host "  3. Close any file explorer windows in apps/api" -ForegroundColor Yellow
    Write-Host "  4. Run this script again" -ForegroundColor Yellow
    exit 1
}
