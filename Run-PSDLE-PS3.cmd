@echo off
setlocal
cd /d "%~dp0"
title PSDLE PS3 Modern Exporter v0.4.2
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0psdle.ps1"
if errorlevel 1 (
  echo.
  echo PSDLE stopped with an error. Read the message above.
  pause
)
endlocal
