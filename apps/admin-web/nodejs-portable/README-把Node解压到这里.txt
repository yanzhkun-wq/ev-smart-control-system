把 Node.js 解压到这个文件夹里（无需安装 .msi）
========================================

1）推荐：直接下载 zip（不用 .msi、不用在网页里翻）：

   https://nodejs.org/dist/v24.15.0/node-v24.15.0-win-x64.zip

   备选目录（自己点 win-x64.zip）：
   https://nodejs.org/dist/latest-v22.x/

2）解压下载的 zip 后，里面会有一个文件夹，里面有 node.exe、npm.cmd 等。

3）把解压出来的【所有文件】移动到本目录「nodejs-portable」下，使得：

   本目录里直接能看到：
   - node.exe
   - npm.cmd

   （不要多一层「node-v24.xx.x-win-x64」文件夹；若有多层，请把里面的文件剪切到本目录。）

4）回到上一级文件夹 apps\admin-web，双击：

   用便携Node启动管理端.bat

5）浏览器打开： http://127.0.0.1:5173/

若仍失败，把黑色窗口里的英文报错截图发对方。
