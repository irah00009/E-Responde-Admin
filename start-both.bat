@echo off
REM Batch Script to Start Both ML Server and Dashboard
REM Run this from the project root: start-both.bat

echo ========================================
echo Starting ML Threat Detection System
echo ========================================
echo.

REM Get the directory where this batch file is located
set "PROJECT_ROOT=%~dp0"
set "ML_SERVER_PATH=%PROJECT_ROOT%ml-threat-detection"

REM Check if ML server directory exists
if not exist "%ML_SERVER_PATH%" (
    echo ERROR: ml-threat-detection folder not found!
    echo Expected at: %ML_SERVER_PATH%
    pause
    exit /b 1
)

echo Step 1: Starting ML Server...
echo    Location: %ML_SERVER_PATH%
echo    Port: 5001
echo.

REM Start ML Server in new window
start "ML Threat Detection Server" cmd /k "cd /d %ML_SERVER_PATH% && echo ML Threat Detection Server && echo Port: 5001 && echo. && python threat_model_server.py"

REM Wait for server to start
echo    Waiting 5 seconds for server to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Step 2: Starting Dashboard...
echo    Location: %PROJECT_ROOT%
echo    Port: 3000 (or your configured port)
echo.

REM Check if node_modules exists
if not exist "%PROJECT_ROOT%node_modules" (
    echo    Installing dependencies first...
    call npm install
)

echo    Starting React Dashboard...
echo.
echo ========================================
echo Both services are starting!
echo ========================================
echo.
echo ML Server: http://localhost:5001
echo Dashboard: http://localhost:3000
echo.
echo To stop:
echo   - Press Ctrl+C in this window (stops Dashboard)
echo   - Close the ML Server window (stops ML server)
echo.

REM Start Dashboard
cd /d %PROJECT_ROOT%
call npm start

pause

