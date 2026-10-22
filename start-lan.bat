@echo off
setlocal
cd /d "%~dp0"
py -3 server.py
if errorlevel 1 (
  echo.
  echo WebDJ failed to start. Run setup-lan.bat first.
  pause
)
