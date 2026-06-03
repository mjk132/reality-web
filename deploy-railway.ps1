# ═══════════════════════════════════════════════════════════
# REALITY — RAILWAY CLOUD DEPLOYMENT
# ═══════════════════════════════════════════════════════════
# Prerequisites:
#   1. Railway account (https://railway.app)
#   2. Railway API token from https://railway.app/account/tokens
#   3. Set RAILWAY_TOKEN before running this script
# ═══════════════════════════════════════════════════════════

param(
  [string]$RailwayToken = "",
  [switch]$Help
)

if ($Help) {
  Write-Host @"
USAGE:
  .\deploy-railway.ps1 -RailwayToken "your_token_here"

  Or set the RAILWAY_TOKEN env var first:
  `$env:RAILWAY_TOKEN = "your_token_here"
  .\deploy-railway.ps1
"@
  exit 0
}

# ─── Token ────────────────────────────────────────────────
if ($RailwayToken) {
  $env:RAILWAY_TOKEN = $RailwayToken
}

if (-not $env:RAILWAY_TOKEN) {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Red
  Write-Host "║  RAILWAY TOKEN REQUIRED                                 ║" -ForegroundColor Red
  Write-Host "║                                                        ║" -ForegroundColor Red
  Write-Host "║  1. Go to https://railway.app/account/tokens           ║" -ForegroundColor Yellow
  Write-Host "║  2. Create a token with project:write scope            ║" -ForegroundColor Yellow
  Write-Host "║  3. Run: .\deploy-railway.ps1 -RailwayToken \"...\"     ║" -ForegroundColor Yellow
  Write-Host "║                                                        ║" -ForegroundColor Red
  Write-Host "║  OR set the env var first:                             ║" -ForegroundColor Red
  Write-Host "║  `$env:RAILWAY_TOKEN = \"your_token_here\"              ║" -ForegroundColor Yellow
  Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Red
  Write-Host ""
  exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  REALITY — RAILWAY DEPLOYMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Verify Git ──────────────────────────────────
Write-Host "[1/6] Verifying git repository..." -ForegroundColor Cyan

$gitRoot = git rev-parse --show-toplevel 2>$null
if (-not $gitRoot) {
  Write-Host "  Initializing git repository..." -ForegroundColor DarkYellow
  git init 2>&1 | Out-Null
  git add -A 2>&1 | Out-Null
  git commit -m "Initial commit — Reality Web Ecosystem" 2>&1 | Out-Null
  Write-Host "  ✓ Git repo initialized" -ForegroundColor Green
} else {
  Write-Host "  ✓ Git repo found" -ForegroundColor Green
}

# ─── Step 2: Create Railway Project ──────────────────────
Write-Host "[2/6] Creating Railway project..." -ForegroundColor Cyan

$projectName = "reality-demo-$(Get-Random -Maximum 99999)"
$projectOutput = railway init --name $projectName 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "  ✗ Failed to create project: $projectOutput" -ForegroundColor Red
  exit 1
}
Write-Host "  ✓ Project '$projectName' created" -ForegroundColor Green

# ─── Step 3: Add MySQL Plugin ────────────────────────────
Write-Host "[3/6] Adding MySQL database plugin..." -ForegroundColor Cyan

$dbOutput = railway add -d mysql 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "  ✗ Failed to add MySQL: $dbOutput" -ForegroundColor Red
  exit 1
}
Write-Host "  ✓ MySQL plugin added — DATABASE_URL injected" -ForegroundColor Green

# Wait for MySQL to provision
Write-Host "  Waiting for MySQL to provision (15s)..." -ForegroundColor DarkYellow
Start-Sleep -Seconds 15

# ─── Step 4: Deploy API Service ──────────────────────────
Write-Host "[4/6] Deploying API service (server/)..." -ForegroundColor Cyan

Set-Location -Path "server"
$apiOutput = railway up --service reality-api --detach 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "  ✗ API deployment failed: $apiOutput" -ForegroundColor Red
  Set-Location -Path ".."
  exit 1
}
Set-Location -Path ".."

# Get the API URL
$apiUrl = railway domain --service reality-api 2>&1 | Select-String -Pattern "https://"
if (-not $apiUrl) {
  $apiUrl = "https://reality-api.up.railway.app"
}
Write-Host "  ✓ API deployed at: $apiUrl" -ForegroundColor Green

# ─── Step 5: Set API URL for Client & Seed Database ──────
Write-Host "[5/6] Configuring environment variables..." -ForegroundColor Cyan

# Set env vars on the client service (will be created next)
railway variable --service reality-web set NEXT_PUBLIC_API_URL="$apiUrl" 2>&1 | Out-Null
railway variable --service reality-web set DEMO_MODE="true" 2>&1 | Out-Null

# Set env vars on the api service
railway variable --service reality-api set DEMO_MODE="true" 2>&1 | Out-Null
railway variable --service reality-api set JWT_SECRET="reality-demo-secret-$(Get-Random -Maximum 99999999)" 2>&1 | Out-Null
railway variable --service reality-api set TOKEN_ENCRYPTION_KEY="demo-key-$(Get-Random -Maximum 99999999)-railway-deploy!!" 2>&1 | Out-Null

Write-Host "  ✓ Environment variables configured" -ForegroundColor Green

# ─── Seed Database ───────────────────────────────────────
Write-Host "  Seeding demo data..." -ForegroundColor DarkYellow
$seedOutput = railway run --service reality-api "npx tsx prisma/seed.ts" 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "  ✓ Database seeded with demo data" -ForegroundColor Green
} else {
  Write-Host "  ⚠ Seed may have failed (database might need more time): $seedOutput" -ForegroundColor DarkYellow
}

# ─── Step 6: Deploy Client Service ──────────────────────
Write-Host "[6/6] Deploying client service (client/)..." -ForegroundColor Cyan

Set-Location -Path "client"
$clientOutput = railway up --service reality-web --detach 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "  ✗ Client deployment failed: $clientOutput" -ForegroundColor Red
  Set-Location -Path ".."
  exit 1
}
Set-Location -Path ".."

# Get the client URL
$clientUrl = railway domain --service reality-web 2>&1 | Select-String -Pattern "https://"
if (-not $clientUrl) {
  $clientUrl = "https://reality-web.up.railway.app"
}

# ─── Done ────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "  Demo Portal:" -ForegroundColor White
Write-Host "  $clientUrl/demo" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "  API Health:" -ForegroundColor White
Write-Host "  $apiUrl/api/health" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "  Available Roles:" -ForegroundColor Cyan
Write-Host "  → OWNER            Full access" -ForegroundColor Yellow
Write-Host "  → HIGH_MANAGEMENT  Management + Appeals" -ForegroundColor Yellow
Write-Host "  → DIRECTOR         Case management" -ForegroundColor Yellow
Write-Host "  → CITIZEN          Dashboard, Garage, Marketplace" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Green
Write-Host "  To manage: https://railway.app/project/$projectName" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
