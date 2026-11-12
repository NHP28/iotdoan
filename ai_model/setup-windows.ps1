$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) { python -m venv .venv }
& '.\.venv\Scripts\python.exe' -m pip install dlib-bin==20.0.1.post1 face-recognition-models click numpy Pillow fastapi uvicorn opencv-python requests
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
& '.\.venv\Scripts\python.exe' -m pip install face-recognition==1.3.0 --no-deps
if ($LASTEXITCODE -ne 0) { throw 'face-recognition installation failed.' }
Write-Output 'Ready. Configure .env, then run .\.venv\Scripts\python.exe pi_worker.py'
