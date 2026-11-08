@echo off
setlocal
cd /d "%~dp0"
title PSDLE PS3 & PS Vita Exporter v0.5.1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0psdle.ps1"
if errorlevel 1 (
  echo.
  echo PSDLE stopped with an error. Read the message above.
  pause
)
endlocal
