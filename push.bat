@echo off
REM Quick commit & push script
REM Usage: push.bat "commit message"

cd /d "C:\xampp\htdocs\pet-vet-system revise"

set MSG=%~1
if "%MSG%"=="" set MSG=Auto-update: %date% %time%

git add -A
git commit -m "%MSG%"
git push origin main

echo ✅ Pushed: %MSG%