@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "PN="
if exist "%~dp0nodejs-portable\node.exe" set "PN=%~dp0nodejs-portable"

if "!PN!"=="" (
  for /d %%i in ("%USERPROFILE%\Desktop\压缩\node-*-win-x64") do (
    if exist "%%i\node.exe" set "PN=%%i"
  )
)

if "!PN!"=="" (
  echo.
  echo [没找到 Node]
  echo 请把下载的 zip 解压到桌面上的文件夹「压缩」里。
  echo 解压后应类似: 桌面\压缩\node-v24.xx.x-win-x64\node.exe
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\vite\" (
  echo 第一次要稍等，正在准备...
  call "!PN!\npm.cmd" install
  if errorlevel 1 (
    echo 出错了，请拍照发对方。
    pause
    exit /b 1
  )
)

echo.
echo 已启动。不要关本窗口。
echo 若浏览器没打开，请自己输入:  http://127.0.0.1:5173
echo.

start "" "http://127.0.0.1:5173"
call "!PN!\npm.cmd" run dev
pause
endlocal
