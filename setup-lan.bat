@echo off
setlocal
cd /d "%~dp0"
echo === WebDJ LAN Bridge setup ===
py -3 -m pip install -r requirements-lan.txt
if errorlevel 1 (
  echo.
  echo Setup failed. Install Python 3.10+ and try again.
  pause
  exit /b 1
)
echo.
echo Setup complete. Run start-lan.bat to start WebDJ.
pause
