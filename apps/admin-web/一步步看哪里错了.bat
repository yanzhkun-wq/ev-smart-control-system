@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========== 第1步：有没有 node？==========
where node
node -v
if errorlevel 1 (
  echo 【失败】没装 Node。打开 https://nodejs.org 点绿色 LTS 安装，装完重启电脑，再双击本文件。
  pause
  exit /b 1
)

echo.
echo ========== 第2步：有没有 npm？==========
where npm
npm -v
if errorlevel 1 (
  echo 【失败】有 node 但没 npm，请卸载 Node 重装，安装时勾选所有默认项。
  pause
  exit /b 1
)

echo.
echo ========== 第3步：装依赖（可能要几分钟）==========
call npm install
if errorlevel 1 (
  echo 【失败】npm install 出错。若文件夹路径里有中文，请把整个项目复制到 C:\zk 再试。
  pause
  exit /b 1
)

echo.
echo ========== 第4步：启动（成功后去浏览器打开 http://127.0.0.1:5173/ ）==========
echo 不要关本窗口！
call npm run dev
pause
