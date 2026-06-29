@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NPM_CMD="
where npm >nul 2>&1 && set "NPM_CMD=npm"
if not defined NPM_CMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM_CMD if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"

if not defined NPM_CMD (
  echo [失败] 找不到 npm，请先安装 Node.js LTS: https://nodejs.org/
  start "" "%WINDIR%\System32\notepad.exe" "%~dp0打不开时先看这个.txt"
  pause
  exit /b 1
)

if not exist "node_modules\vite\" (
  echo 正在 npm install …
  call "%NPM_CMD%" install
  if errorlevel 1 ( echo [失败] npm install 出错 & pause & exit /b 1 )
)

echo.
echo [1] 正在新开窗口启动 Vite（请勿关闭名为「智控-Vite」的窗口）…
start "智控-Vite" cmd /k "%~dp0_只启动Vite服务.bat"

echo [2] 等待 15 秒让服务起来…
timeout /t 15 /nobreak >nul

set "EDGE="
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined EDGE if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

echo [3] 用 Edge 打开（注意地址带 :5173）…
if defined EDGE (
  start "" "%EDGE%" "http://127.0.0.1:5173/"
) else (
  start "" "http://127.0.0.1:5173/"
)

echo.
echo 若仍是「拒绝连接」：
echo   - 请看「智控-Vite」黑窗口里是否有一行 Local: http://127.0.0.1:5173/
echo   - 地址栏必须是 http://127.0.0.1:5173/ （不能省略 :5173）
echo   - 打开同目录下的「打不开时先看这个.txt」
echo.
pause
