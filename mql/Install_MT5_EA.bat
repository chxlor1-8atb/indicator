@echo off
chcp 65001 >nul
if exist "%~dp0scripts\install-mt5-ea.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-mt5-ea.ps1"
) else if exist "%~dp0mql\install-mt5-ea.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0mql\install-mt5-ea.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-mt5-ea.ps1"
)
if %errorlevel% neq 0 pause
