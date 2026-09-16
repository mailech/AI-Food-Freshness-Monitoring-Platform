@echo off
REM ===========================================================================
REM  Double-click launcher for the AI Food Freshness Monitoring Platform.
REM
REM  Runs showcase.ps1, which starts the whole stack, verifies it with real API
REM  calls and opens a guided browser tour.
REM
REM  Pass any showcase.ps1 switch straight through, for example:
REM      showcase.bat -Mode local -Reseed -FastSeed
REM      showcase.bat -Stop
REM ===========================================================================

setlocal
cd /d "%~dp0"

echo.
echo   Launching the AI Food Freshness Monitoring Platform showcase...
echo.

REM -ExecutionPolicy Bypass so the script runs without changing machine policy.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0showcase.ps1" %*

set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
    echo.
    echo   The launcher exited with code %RC%. Scroll up for the reason.
)

echo.
echo   Press any key to close this window.
echo   ^(The backend and frontend keep running in their own windows.^)
pause >nul

endlocal
exit /b %RC%
