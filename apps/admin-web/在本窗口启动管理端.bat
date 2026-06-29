@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NPM_CMD="
where npm >nul 2>&1 && set "NPM_CMD=npm"
if not defined NPM_CMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM_CMD if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"

if not defined NPM_CMD (
  echo 【失败】找不到 npm。请先安装 Node.js: https://nodejs.org/
  echo 装好后可先运行「诊断-环境.bat」检查。
  pause
  exit /b 1
)

if not exist "node_modules\vite\" (
  echo 首次运行，正在 npm install …
  call "%NPM_CMD%" install
  if errorlevel 1 (
    echo 【失败】npm install 出错，请截图发技术支持或把上面英文错误复制出来。
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo  正在启动… 成功后会显示 Local / Network 地址
echo  不要关本窗口！然后在浏览器打开下面任一地址：
echo    http://127.0.0.1:5173/
echo    http://localhost:5173/
echo  若 QQ 浏览器异常，换 Edge / Chrome 试同一地址
echo ========================================
echo.

call "%NPM_CMD%" run dev
echo.
echo 服务已退出。按任意键关闭…
pause
