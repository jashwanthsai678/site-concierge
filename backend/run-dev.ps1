# Launched by scripts/dev.ps1 in its own terminal window. Uses
# $PSScriptRoot instead of a path passed on the command line — sidesteps
# PowerShell's Start-Process argument-quoting issues with spaces in paths.
Set-Location -LiteralPath $PSScriptRoot
& "$PSScriptRoot\.venv\Scripts\Activate.ps1"
uvicorn app.main:app --reload --port 8010
