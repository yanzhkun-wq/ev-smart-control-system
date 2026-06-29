@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========== 智控管理端 - 环境诊断 ==========
echo.
echo [1] 当前目录:
cd

echo.
echo [2] 查找 node / npm:
where node 2>nul
where npm 2>nul
if exist "%ProgramFiles%\nodejs\node.exe" echo 发现: "%ProgramFiles%\nodejs\node.exe"
if exist "%ProgramFiles%\nodejs\npm.cmd" echo 发现: "%ProgramFiles%\nodejs\npm.cmd"

echo.
echo [3] 版本 (失败则说明未安装或未进 PATH):
node -v 2>nul || echo   node: 无法运行
npm -v 2>nul || echo   npm: 无法运行

echo.
echo [4] 依赖目录:
if exist "node_modules\vite\" (echo   node_modules 存在，vite 已安装) else (echo   【缺少】node_modules，需在本目录执行: npm install)

echo.
echo [5] 5173 端口是否已被占用 (有输出说明可能被别的程序占满):
netstat -ano | findstr ":5173"

echo.
echo [6] 若服务已启动，探测本机 5173 (失败为正常现象):
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2; Write-Host 'HTTP状态:' $r.StatusCode } catch { Write-Host '无法连接 5173:' $_.Exception.Message }" 2>nul

echo.
echo ========== 说明 ==========
echo - 若 node/npm 失败: 安装 https://nodejs.org/ LTS，勾选 Add to PATH，重启电脑后再试。
echo - 若缺少 node_modules: 在本窗口执行  npm install
echo - 启动请双击: 在本窗口启动管理端.bat  （可看清红色报错）
echo.
pause
