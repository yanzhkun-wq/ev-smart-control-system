$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
# 脚本所在目录即「智控系统」项目根目录
$projRoot = $PSScriptRoot
if (-not $projRoot) {
  $projRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$desk = Split-Path -Parent $projRoot
# 桌面文件名仅用 ASCII，避免中文在资源管理器里显示乱码
$zip = Join-Path $desk ("zhikong-full-backup-{0}.zip" -f $stamp)
$note = Join-Path $desk ("zhikong-full-backup-{0}-readme.txt" -f $stamp)
if (-not (Test-Path -LiteralPath $projRoot)) {
  Write-Error "Project root not found: $projRoot"
  exit 1
}

$when = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$txt = @"
备份生成时间（本机）: $when
项目根目录: $projRoot
压缩包路径: $zip

说明: 本压缩包为「智控系统」项目根目录的完整打包（包含当前目录下全部文件与子目录；若有 node_modules、.git 等亦一并打包）。
桌面上的 ZIP / 说明文件名使用英文（zhikong-full-backup-*.zip），避免 Windows 下列名乱码。

再次备份: 在 PowerShell 中执行（路径按实际修改）：
  powershell -NoProfile -ExecutionPolicy Bypass -File "<本脚本完整路径>"
"@
Set-Content -LiteralPath $note -Encoding UTF8 -Value $txt

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}

Compress-Archive -LiteralPath $projRoot -DestinationPath $zip -Force

Write-Output "OK ZIP -> $zip"
Write-Output "OK NOTE -> $note"
