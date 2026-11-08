@echo off
setlocal
cd /d "%~dp0"
title PSDLE PlayStation Library Exporter v0.5.0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0psdle.ps1"
if errorlevel 1 (
  echo.
  echo PSDLE stopped with an error. Read the message above.
  pause
)
endlocal
