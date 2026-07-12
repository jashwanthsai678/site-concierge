# Launches backend (uvicorn --reload) and frontend (vite dev) each in
# their own terminal window, for fast local iteration. This — not Docker
# Compose — is the primary dev loop; Compose is the deployment artifact.
#
# Delegates to backend/run-dev.ps1 and frontend/run-dev.ps1 via -File
# (a single clean path argument) rather than building a compound -Command
# string — paths containing spaces corrupt manually-quoted -Command strings
# passed through Start-Process's own argument handling.
$root = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $root 'backend\run-dev.ps1'
$frontendScript = Join-Path $root 'frontend\run-dev.ps1'

Write-Host "Starting AI Conversion OS (backend + frontend)..."

Start-Process powershell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $backendScript)
Start-Process powershell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $frontendScript)

Write-Host ""
Write-Host "Backend health:  http://localhost:8010/api/health"
Write-Host "Ad simulator:    http://localhost:5173/demo"
Write-Host "Dashboard:       http://localhost:5173/dashboard"
Write-Host ""
Write-Host "First run? From the backend dir: python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt"
Write-Host "First run? From the frontend dir: npm install"
