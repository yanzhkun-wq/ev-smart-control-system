@echo off
chcp 65001 >nul
title 智控管理端 - 安装 Node.js 说明

echo.
echo ============================================================
echo   为什么浏览器一直「拒绝连接」？
echo ============================================================
echo.
echo   管理端需要在本机运行一个叫「Vite」的服务，它依赖 Node.js。
echo   您当前电脑标准路径下**没有** npm（未安装 Node.js 或未装完整）。
echo.
echo   没有 npm 就无法执行 npm install，目录里也不会有 node_modules，
echo   服务起不来，浏览器访问 127.0.0.1:5173 就会一直「拒绝连接」。
echo.
echo ============================================================
echo   您现在要做的事（只需做一次）
echo ============================================================
echo.
echo   1. 下面会自动打开 Node.js 官网下载页
echo   2. 下载 Windows 「LTS」 安装包（.msi 或 64-bit）
echo   3. 安装时务必勾选：Add to PATH
echo   4. 安装结束后**重启电脑**（或至少注销重新登录）
echo   5. 再双击运行：一键启动并用Edge打开.bat
echo.
echo ============================================================
pause
start https://nodejs.org/zh-cn/
echo.
echo 若已安装过，仍提示没有 npm：多半是装时没勾选 Add to PATH，
echo 请卸载后重装，或把「C:\Program Files\nodejs」加到系统环境变量 Path。
echo.
pause
