@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NPM_CMD="
where npm >nul 2>&1 && set "NPM_CMD=npm"
if not defined NPM_CMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM_CMD if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"

if not defined NPM_CMD (
  echo [错误] 未找到 npm。
  echo 1. 打开 https://nodejs.org/ 下载并安装 LTS 版 Node.js
  echo 2. 安装时勾选 "Add to PATH"
  echo 3. 关掉本窗口，重新双击本脚本
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 正在安装依赖，请稍候…
  call "%NPM_CMD%" install
  if errorlevel 1 (
    echo npm install 失败
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo   不要关闭本窗口！关了就打不开网页。
echo   看到 "Local: http://127.0.0.1:5173/" 后再开浏览器。
echo ========================================
echo   浏览器地址: http://127.0.0.1:5173/
echo   或试: http://localhost:5173/
echo ========================================
echo.

call "%NPM_CMD%" run dev -- --host 127.0.0.1 --port 5173
echo.
echo 服务已停止（窗口关掉或出错）。按任意键退出…
pause
