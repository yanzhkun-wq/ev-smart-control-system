@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NPM_CMD="
where npm >nul 2>&1 && set "NPM_CMD=npm"
if not defined NPM_CMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM_CMD if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"

if not defined NPM_CMD (
  echo [错误] 未找到 npm
  pause
  exit /b 1
)

call "%NPM_CMD%" run dev
pause
