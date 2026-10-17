@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Primero ejecutar INSTALAR.cmd
  pause
  exit /b 1
)
if not exist "config.json" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURAR-RENDER.ps1"
  if errorlevel 1 exit /b 1
)
".venv\Scripts\python.exe" -u agent.py
if errorlevel 1 pause
