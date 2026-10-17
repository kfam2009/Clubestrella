@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Primero ejecutar PREPARAR-PRUEBA.cmd
  pause
  exit /b 1
)
if not exist "prueba-local.json" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURAR-PRUEBA.ps1"
  if errorlevel 1 exit /b 1
)
".venv\Scripts\python.exe" -u agent.py --local-only --config prueba-local.json
if errorlevel 1 pause
