# ═══════════════════════════════════════════════════════════
# REALITY DEMO — Sandbox Environment Setup
# ═══════════════════════════════════════════════════════════
# Prerequisites: Docker Desktop, Node.js v24+
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor DarkYellow
Write-Host "  REALITY DEMO SETUP" -ForegroundColor Yellow
Write-Host "  Sandbox Environment Orchestrator" -ForegroundColor DarkYellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor DarkYellow
Write-Host ""

# ─── Step 1: Start Docker containers ────────────────────
Write-Host "[1/5] Starting Docker containers (MariaDB + Redis)..." -ForegroundColor Cyan

$dockerCheck = docker ps 2>$null
if (-not $?) {
    Write-Host "  ✗ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

docker compose up -d 2>&1 | Out-Null
if ($?) {
    Write-Host "  ✓ Containers started" -ForegroundColor Green
} else {
    Write-Host "  ✗ Failed to start containers" -ForegroundColor Red
    exit 1
}

# ─── Step 2: Wait for MariaDB to be ready ───────────────
Write-Host "[2/5] Waiting for MariaDB to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

$maxRetries = 15
$retryCount = 0
$dbReady = $false

while (-not $dbReady -and $retryCount -lt $maxRetries) {
    try {
        $conn = docker exec reality-mariadb-1 mysqladmin ping -h localhost -u root -preality_root 2>&1
        if ($conn -match "mysqld is alive") {
            $dbReady = $true
        }
    } catch {
        # not ready yet
    }
    if (-not $dbReady) {
        $retryCount++
        Write-Host "  Waiting... ($retryCount/$maxRetries)" -ForegroundColor DarkYellow
        Start-Sleep -Seconds 2
    }
}

if ($dbReady) {
    Write-Host "  ✓ MariaDB is ready" -ForegroundColor Green
} else {
    Write-Host "  ✗ MariaDB did not become ready in time" -ForegroundColor Red
    exit 1
}

# ─── Step 3: Set demo environment and install deps ──────
Write-Host "[3/5] Setting DEMO_MODE environment..." -ForegroundColor Cyan

$env:DEMO_MODE = "true"

# Install server dependencies if needed
if (-not (Test-Path "server/node_modules/.package-lock.json")) {
    Write-Host "  Installing server dependencies..." -ForegroundColor DarkYellow
    Set-Location -Path "server"
    npm install 2>&1 | Out-Null
    Set-Location -Path ".."
    Write-Host "  ✓ Server dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✓ Server dependencies found" -ForegroundColor Green
}

# Install client dependencies if needed
if (-not (Test-Path "client/node_modules/.package-lock.json")) {
    Write-Host "  Installing client dependencies..." -ForegroundColor DarkYellow
    Set-Location -Path "client"
    npm install 2>&1 | Out-Null
    Set-Location -Path ".."
    Write-Host "  ✓ Client dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✓ Client dependencies found" -ForegroundColor Green
}

# ─── Step 4: Push Prisma schema and seed ────────────────
Write-Host "[4/5] Pushing Prisma schema to sandbox database..." -ForegroundColor Cyan

Set-Location -Path "server"

npx prisma db push --accept-data-loss 2>&1
if ($?) {
    Write-Host "  ✓ Schema pushed successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Schema push failed" -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}

Write-Host "  Seeding demo data..." -ForegroundColor DarkYellow
npx tsx prisma/seed.ts 2>&1
if ($?) {
    Write-Host "  ✓ Demo data seeded" -ForegroundColor Green
} else {
    Write-Host "  ✗ Seed failed" -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}

Set-Location -Path ".."

# ─── Step 5: Start servers ──────────────────────────────
Write-Host "[5/5] Starting development servers..." -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEMO ENVIRONMENT READY" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "  Server API:  http://localhost:3001" -ForegroundColor White
Write-Host "  Client App:  http://localhost:3000" -ForegroundColor White
Write-Host "  Demo Login:  http://localhost:3000/demo" -ForegroundColor Yellow
Write-Host "  Prisma GUI:  http://localhost:5555 (npx prisma studio)" -ForegroundColor DarkGray
Write-Host "" -ForegroundColor Green
Write-Host "  Available Demo Accounts:" -ForegroundColor Cyan
Write-Host "    →  OWNER            Full system access" -ForegroundColor Yellow
Write-Host "    →  HIGH_MANAGEMENT  Management + Appeals" -ForegroundColor Yellow
Write-Host "    →  DIRECTOR         Case management" -ForegroundColor Yellow
Write-Host "    →  CITIZEN          Dashboard, Garage, Marketplace" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Green
Write-Host "  To suppress: Press Ctrl+C in each terminal" -ForegroundColor DarkGray
Write-Host "  To teardown: docker compose down" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Start both servers in parallel
Write-Host "Starting servers in separate windows..." -ForegroundColor Cyan

$serverDir = Join-Path $PWD.Path "server"
$clientDir = Join-Path $PWD.Path "client"

# Start API server
$apiJob = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$serverDir'; `$env:DEMO_MODE='true'; npm run dev" -PassThru

# Start client
$clientJob = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$clientDir'; npm run dev" -PassThru

Write-Host "  API server process ID: $($apiJob.Id)" -ForegroundColor DarkYellow
Write-Host "  Client process ID: $($clientJob.Id)" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Open your browser to: http://localhost:3000/demo" -ForegroundColor Green
Write-Host ""
