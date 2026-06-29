@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "PN=%~dp0nodejs-portable"
set "NODE_EXE=%PN%\node.exe"
set "NPM_CMD=%PN%\npm.cmd"

if not exist "%NODE_EXE%" (
  echo.
  echo [缺少文件] 未发现 %NODE_EXE%
  echo.
  echo 请打开文件夹并按说明操作:
  echo   %PN%
  echo 详细步骤见上级目录: 便携Node说明-请看.txt
  echo.
  start "" "%WINDIR%\explorer.exe" "%PN%"
  if exist "%~dp0便携Node说明-请看.txt" start "" "%~dp0便携Node说明-请看.txt"
  if exist "%PN%\README-把Node解压到这里.txt" start "" "%PN%\README-把Node解压到这里.txt"
  pause
  exit /b 1
)

if not exist "%NPM_CMD%" (
  echo [缺少文件] 未发现 npm.cmd，请重新解压完整 Node zip 到 nodejs-portable
  pause
  exit /b 1
)

if not exist "node_modules\vite\" (
  echo 首次运行：正在用便携 Node 执行 npm install …
  call "%NPM_CMD%" install
  if errorlevel 1 (
    echo npm install 失败，请截图本窗口发技术支持。
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo  服务启动后，用浏览器打开:
echo   http://127.0.0.1:5173/
echo  不要关闭本窗口
echo ========================================
echo.

call "%NPM_CMD%" run dev
echo.
pause
