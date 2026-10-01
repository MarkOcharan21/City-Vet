# City Vet System - one-click reconnect (run after PC restart)
$ErrorActionPreference = "Continue"

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$LogFile = Join-Path $Root "system-start.log"
$CaddyDir   = "C:\Users\KB\caddy"
$CaddyExe   = "C:\Users\KB\AppData\Local\Microsoft\WinGet\Packages\CaddyServer.Caddy_Microsoft.Winget.Source_8wekyb3d8bbwe\caddy.exe"
$CaddyLog   = Join-Path $CaddyDir "caddy-err.log"
$PublicUrl  = "https://cityvet.duckdns.org"

function Log($m) {
  $ts = Get-Date -Format "HH:mm:ss"
  Write-Host "[$ts] $m"
  Add-Content -Path $LogFile -Value "[$ts] $m"
}

Log "==== City Vet reconnect started ===="

# 0) Stop Apache (port 443 conflict) and any old Caddy
Log "Stopping Apache and old Caddy..."
Get-Process -Name "httpd" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "caddy" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 1) Start Caddy (reverse proxy: HTTPS :443 -> localhost:5000)
Log "Starting Caddy..."
Remove-Item $CaddyLog -ErrorAction SilentlyContinue
Start-Process -FilePath $CaddyExe -ArgumentList "run","--config","$CaddyDir\caddy.json" `
  -WorkingDirectory $CaddyDir `
  -RedirectStandardError $CaddyLog -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 2
  try {
    $h = Invoke-RestMethod -Uri "$PublicUrl/api/health" -TimeoutSec 10
    if ($h.success) { $url = $PublicUrl; break }
  } catch { }
}

if (-not $url) {
  Log "FAILED: Caddy did not come up. Check $CaddyLog"
  exit 1
}
Log "Caddy URL: $url"

# 2) Update backend .env BEFORE starting the backend so the running process
#    picks up the new BACKEND_URL. FRONTEND_URL must be the public Vercel
#    origin — the QR landing page (/qr/:token) and the password-reset /
#    account-setup email links all redirect there, so a localhost value
#    breaks every link for anyone not on this PC.
$envPath = Join-Path $Backend ".env"
$envTxt = Get-Content $envPath -Raw
$envTxt = [regex]::Replace($envTxt, '(?m)^BACKEND_URL=.*$', "BACKEND_URL=$url")
$envTxt = [regex]::Replace($envTxt, '(?m)^FRONTEND_URL=.*$', "FRONTEND_URL=https://city-vet.vercel.app")
Set-Content -Path $envPath -Value $envTxt -NoNewline
Log "Updated backend .env BACKEND_URL + FRONTEND_URL"

# 3) Start the backend (it auto-frees port 5000)
Log "Starting backend (node server.js)..."
Remove-Item (Join-Path $Backend "backend-out.log") -ErrorAction SilentlyContinue
Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory $Backend `
  -RedirectStandardOutput (Join-Path $Backend "backend-out.log") `
  -RedirectStandardError (Join-Path $Backend "backend-err.log") `
  -WindowStyle Hidden
Start-Sleep -Seconds 10

# 4) Update Vercel environment variables VITE_API_URL (no trailing newline)
$apiUrl = "$url/api"
Log "Updating Vercel env VITE_API_URL = $apiUrl"
vercel env rm VITE_API_URL production --yes 2>$null
vercel env rm VITE_API_URL preview --yes 2>$null
vercel env rm VITE_API_URL development --yes 2>$null

cmd /c ("echo|set /p=`"" + $apiUrl + "`"|vercel env add VITE_API_URL production")
cmd /c ("echo|set /p=`"" + $apiUrl + "`"|vercel env add VITE_API_URL preview")
cmd /c ("echo|set /p=`"" + $apiUrl + "`"|vercel env add VITE_API_URL development")

# 5) Redeploy to Vercel production (--archive=tgz bypasses the >5000 file limit)
Log "Deploying to Vercel (this takes ~1 minute)..."
vercel --prod --yes --archive=tgz

# 6) Refresh QR images so scanned codes point to the new backend URL
Log "Regenerating QR images..."
Push-Location $Backend
node regenerate-qrcodes.js 2>$null | Out-Null
Pop-Location

# 7) Health check
Start-Sleep -Seconds 3
try {
  $h = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 20
  Log "HEALTH OK: $($h.message)"
} catch {
  Log "Health check failed: $($_.Exception.Message)"
  Log "Login page: https://city-vet.vercel.app"
  exit 1
}

# 8) Verify the QR landing redirect actually reaches the public frontend.
#    /qr/:token must 302 to https://city-vet.vercel.app/public/:token — a
#    localhost redirect here means scanned codes still open the phone's own
#    localhost and the whole cellphone flow is broken.
try {
  $probe = Invoke-WebRequest -Uri "$url/qr/__probe__" -UseBasicParsing -TimeoutSec 20 -MaximumRedirection 0
  $loc = $probe.Headers.Location
} catch {
  $loc = $_.Exception.Response.Headers.Location
}
if ($loc -and $loc -match '^https://city-vet\.vercel\.app/public/') {
  Log "QR REDIRECT OK: $loc"
} else {
  Log "QR REDIRECT BAD: $loc"
  Log "Check FRONTEND_URL in backend/.env (must be https://city-vet.vercel.app)"
  exit 1
}

Log "DONE. Login at https://city-vet.vercel.app (owner: Kaizenbrix05@gmail.com)"
