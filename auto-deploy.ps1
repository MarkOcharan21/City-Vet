# City Vet System - Auto Deploy Script
# Runs on startup, handles everything automatically

$ErrorActionPreference = "Continue"

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$LogFile = Join-Path $Root "auto-deploy.log"
$PublicUrl = $null

function Log($m) {
  $ts = Get-Date -Format "HH:mm:ss"
  Write-Host "[$ts] $m"
  Add-Content -Path $LogFile -Value "[$ts] $m"
}

Log "==== City Vet Auto Deploy started ===="

# 0) Stop old processes
Log "Stopping old processes..."
Get-Process -Name "httpd" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "caddy" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 1) Start backend first
Log "Starting backend (node server.js)..."
Remove-Item (Join-Path $Backend "backend-out.log") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Backend "backend-err.log") -ErrorAction SilentlyContinue
Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory $Backend `
  -RedirectStandardOutput (Join-Path $Backend "backend-out.log") `
  -RedirectStandardError (Join-Path $Backend "backend-err.log") `
  -WindowStyle Hidden
Start-Sleep -Seconds 10

# 2) Start Cloudflare quick tunnel
Log "Starting Cloudflare tunnel..."
Remove-Item (Join-Path $Root "cloudflared-out.log") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Root "cloudflared-err.log") -ErrorAction SilentlyContinue
Start-Process -FilePath "cloudflared" -ArgumentList "tunnel","--url","http://localhost:5000" `
  -RedirectStandardOutput (Join-Path $Root "cloudflared-out.log") `
  -RedirectStandardError (Join-Path $Root "cloudflared-err.log") `
  -WindowStyle Hidden

# 3) Wait for tunnel URL
Log "Waiting for tunnel URL..."
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  $logContent = Get-Content (Join-Path $Root "cloudflared-err.log") -Raw -ErrorAction SilentlyContinue
  if ($logContent -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
    $PublicUrl = $matches[0]
    break
  }
}

if (-not $PublicUrl) {
  Log "FAILED: Could not get tunnel URL"
  exit 1
}
Log "Tunnel URL: $PublicUrl"

# 4) Update backend .env
Log "Updating backend .env..."
$envPath = Join-Path $Backend ".env"
$envTxt = Get-Content $envPath -Raw
$envTxt = [regex]::Replace($envTxt, '(?m)^BACKEND_URL=.*$', "BACKEND_URL=$PublicUrl")
$envTxt = [regex]::Replace($envTxt, '(?m)^FRONTEND_URL=.*$', "FRONTEND_URL=https://city-vet.vercel.app")
Set-Content -Path $envPath -Value $envTxt -NoNewline

# 5) Restart backend to pick up new .env
Log "Restarting backend..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -like "*server.js*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory $Backend `
  -RedirectStandardOutput (Join-Path $Backend "backend-out.log") `
  -RedirectStandardError (Join-Path $Backend "backend-err.log") `
  -WindowStyle Hidden
Start-Sleep -Seconds 10

# 6) Update Vercel env
Log "Updating Vercel env VITE_API_URL..."
$apiUrl = "$PublicUrl/api"
vercel env rm VITE_API_URL production --yes 2>$null
vercel env rm VITE_API_URL preview --yes 2>$null
vercel env rm VITE_API_URL development --yes 2>$null
cmd /c ("echo|set /p=`"" + $apiUrl + "`"|vercel env add VITE_API_URL production")
cmd /c ("echo|set /p=`"" + $apiUrl + "`"|vercel env add VITE_API_URL preview")
cmd /c ("echo|set /p=`"" + $apiUrl + "`"|vercel env add VITE_API_URL development")

# 7) Deploy to Vercel
Log "Deploying to Vercel..."
vercel --prod --yes --archive=tgz

# 8) Regenerate QR codes
Log "Regenerating QR codes..."
Push-Location $Backend
node regenerate-qrcodes.js 2>$null | Out-Null
Pop-Location

# 9) Health check
Start-Sleep -Seconds 3
try {
  $h = Invoke-RestMethod -Uri "$PublicUrl/api/health" -TimeoutSec 20
  Log "HEALTH OK: $($h.message)"
} catch {
  Log "Health check failed: $($_.Exception.Message)"
  exit 1
}

# 10) Verify QR redirect
try {
  $probe = Invoke-WebRequest -Uri "$PublicUrl/qr/__probe__" -UseBasicParsing -TimeoutSec 20 -MaximumRedirection 0
  $loc = $probe.Headers.Location
} catch {
  $loc = $_.Exception.Response.Headers.Location
}
if ($loc -and $loc -match '^https://city-vet\.vercel\.app/public/') {
  Log "QR REDIRECT OK: $loc"
} else {
  Log "QR REDIRECT BAD: $loc"
}

Log "DONE. Login at https://city-vet.vercel.app"
Log "Backend URL: $PublicUrl"
