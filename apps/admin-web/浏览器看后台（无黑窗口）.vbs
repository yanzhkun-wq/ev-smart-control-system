' 双击本文件：不弹出黑窗口，装好依赖后启动网页预览（需已安装 Node.js）
Option Explicit
Dim sh, fso, base, cmd, edge
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)

' 1) 若没有依赖，静默执行 npm install（首次可能要几分钟，请等待）
cmd = "cmd /c cd /d " & Chr(34) & base & Chr(34) & " && if not exist node_modules\vite\package.json npm install"
sh.Run cmd, 0, True

' 2) 后台启动 Vite（无窗口）
cmd = "cmd /c cd /d " & Chr(34) & base & Chr(34) & " && npm run dev"
sh.Run cmd, 0, False

' 3) 等服务起来再打开浏览器
WScript.Sleep 12000

edge = sh.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
If Not fso.FileExists(edge) Then edge = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
If fso.FileExists(edge) Then
  sh.Run Chr(34) & edge & Chr(34) & " http://127.0.0.1:5173/", 1, False
Else
  sh.Run "http://127.0.0.1:5173/", 1, False
End If
