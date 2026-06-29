@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NPM_CMD="
where npm >nul 2>&1 && set "NPM_CMD=npm"
if not defined NPM_CMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM_CMD if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"

if not defined NPM_CMD (
  echo [错误] 未找到 npm。请先安装 Node.js LTS: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 正在安装依赖…
  call "%NPM_CMD%" install
  if errorlevel 1 ( echo 安装失败 & pause & exit /b 1 )
)

echo.
echo [1/2] 正在新开窗口启动管理端（请勿关闭该窗口）…
start "智控-管理端-Vite" cmd /k "%~dp0_只启动Vite服务.bat"

echo [2/2] 等待约 12 秒后尝试用 QQ 浏览器打开…
timeout /t 12 /nobreak >nul

set "QQB="
if exist "%LOCALAPPDATA%\Tencent\QQBrowser\Application\qqbrowser.exe" set "QQB=%LOCALAPPDATA%\Tencent\QQBrowser\Application\qqbrowser.exe"
if not defined QQB if exist "%LOCALAPPDATA%\Tencent\QQBrowser\Application\QQBrowser.exe" set "QQB=%LOCALAPPDATA%\Tencent\QQBrowser\Application\QQBrowser.exe"
if not defined QQB if exist "%ProgramFiles%\Tencent\QQBrowser\Application\qqbrowser.exe" set "QQB=%ProgramFiles%\Tencent\QQBrowser\Application\qqbrowser.exe"
if not defined QQB if exist "%ProgramFiles(x86)%\Tencent\QQBrowser\Application\qqbrowser.exe" set "QQB=%ProgramFiles(x86)%\Tencent\QQBrowser\Application\qqbrowser.exe"

if defined QQB (
  echo 使用 QQ 浏览器: %QQB%
  start "" "%QQB%" "http://127.0.0.1:5173/"
) else (
  echo 未找到 QQ 浏览器，使用系统默认浏览器打开。
  start "" "http://127.0.0.1:5173/"
)

echo.
echo 浏览器可打开（服务需已启动）:
echo   http://127.0.0.1:5173/
echo   http://localhost:5173/
echo 若本机有多个网卡，也可看黑窗口里打印的 Network 地址。
echo.
pause
