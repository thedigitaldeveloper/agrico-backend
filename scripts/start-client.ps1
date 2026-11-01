$ErrorActionPreference = 'Stop'
$backend = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path (Split-Path $backend -Parent) 'agrico-frontend'
$node = (Get-Command node).Source
New-Item -ItemType Directory -Force -Path (Join-Path $backend 'logs'), (Join-Path $frontend 'logs') | Out-Null
$cms = Start-Process -FilePath $node -ArgumentList 'node_modules/@strapi/strapi/bin/strapi.js','start' -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $backend 'logs/local.out.log') -RedirectStandardError (Join-Path $backend 'logs/local.err.log') -PassThru
$web = Start-Process -FilePath $node -ArgumentList 'node_modules/next/dist/bin/next','dev','--port','3003' -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $frontend 'logs/local.out.log') -RedirectStandardError (Join-Path $frontend 'logs/local.err.log') -PassThru
@{ backend = $cms.Id; frontend = $web.Id } | ConvertTo-Json | Set-Content (Join-Path $backend 'logs/local-processes.json')
Write-Output 'Agrico: website http://localhost:3003, CMS http://localhost:1340/admin'
