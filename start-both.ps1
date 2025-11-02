# PowerShell Script to Start Both ML Server and Dashboard
# Run this from the project root: .\start-both.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting ML Threat Detection System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the project root directory (where this script is located)
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mlServerPath = Join-Path $projectRoot "ml-threat-detection"

# Check if ML server directory exists
if (-not (Test-Path $mlServerPath)) {
    Write-Host "ERROR: ml-threat-detection folder not found!" -ForegroundColor Red
    Write-Host "Expected at: $mlServerPath" -ForegroundColor Red
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found! Please install Python." -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>&1
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found! Please install Node.js." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Starting ML Server..." -ForegroundColor Yellow
Write-Host "   Location: $mlServerPath" -ForegroundColor Gray
Write-Host "   Port: 5001" -ForegroundColor Gray

# Start ML Server in new PowerShell window
$mlServerScript = Join-Path $mlServerPath "threat_model_server.py"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$mlServerPath'; Write-Host 'ML Threat Detection Server' -ForegroundColor Cyan; Write-Host 'Port: 5001' -ForegroundColor Gray; Write-Host ''; python threat_model_server.py"
) -WindowStyle Normal

# Wait for server to start
Write-Host "   Waiting 5 seconds for server to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Check if server is running
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 2 -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "   ✅ ML Server is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  ML Server may still be starting..." -ForegroundColor Yellow
    Write-Host "   Check the ML Server window for status" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 2: Starting Dashboard..." -ForegroundColor Yellow
Write-Host "   Location: $projectRoot" -ForegroundColor Gray
Write-Host "   Port: 3000 (or your configured port)" -ForegroundColor Gray
Write-Host ""

# Change to project root and start Dashboard
Set-Location $projectRoot

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing dependencies first..." -ForegroundColor Yellow
    npm install
}

Write-Host "   Starting React Dashboard..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Both services are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 ML Server: http://localhost:5001" -ForegroundColor Cyan
Write-Host "📱 Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop:" -ForegroundColor Gray
Write-Host "  - Press Ctrl+C in this window (stops Dashboard)" -ForegroundColor Gray
Write-Host "  - Close the ML Server window (stops ML server)" -ForegroundColor Gray
Write-Host ""

# Start Dashboard
npm start

