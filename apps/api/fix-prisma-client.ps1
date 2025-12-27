# Fix Prisma Client Sync Issue
# This script stops Node processes and regenerates the Prisma client

Write-Host "Stopping Node processes that might be using Prisma files..." -ForegroundColor Yellow

# Get Node processes (excluding Cursor's internal processes)
$nodeProcesses = Get-Process | Where-Object {
    $_.ProcessName -eq "node" -and 
    $_.Path -like "*nodejs*" -and
    $_.Path -notlike "*cursor*"
}

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node process(es) to stop:" -ForegroundColor Cyan
    $nodeProcesses | ForEach-Object {
        Write-Host "  - PID $($_.Id): $($_.Path)" -ForegroundColor Gray
    }
    
    $response = Read-Host "Stop these processes? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        $nodeProcesses | Stop-Process -Force
        Write-Host "Stopped Node processes. Waiting 2 seconds..." -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Skipping process termination. You may need to stop the server manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "No Node processes found (or they're Cursor internal processes)." -ForegroundColor Gray
}

Write-Host "`nRemoving old Prisma client files..." -ForegroundColor Yellow
$prismaClientPath = Join-Path $PSScriptRoot "node_modules\.prisma"
if (Test-Path $prismaClientPath) {
    try {
        Remove-Item -Path $prismaClientPath -Recurse -Force -ErrorAction Stop
        Write-Host "Removed old Prisma client files." -ForegroundColor Green
    } catch {
        Write-Host "Could not remove Prisma client files: $_" -ForegroundColor Red
        Write-Host "Please close any programs that might be using these files (Cursor, VS Code, file explorer) and try again." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Prisma client folder not found (already removed or doesn't exist)." -ForegroundColor Gray
}

Write-Host "`nRegenerating Prisma client..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPrisma client regenerated successfully!" -ForegroundColor Green
    Write-Host "You can now restart the server with: npm run dev" -ForegroundColor Green
} else {
    Write-Host "`nError regenerating Prisma client." -ForegroundColor Red
    Write-Host "Try:" -ForegroundColor Yellow
    Write-Host "  1. Close Cursor/VS Code" -ForegroundColor Yellow
    Write-Host "  2. Close any file explorer windows in the apps/api folder" -ForegroundColor Yellow
    Write-Host "  3. Run this script again" -ForegroundColor Yellow
    exit 1
}

