<#
.SYNOPSIS
    One-command showcase launcher for the AI Food Freshness Monitoring Platform.

.DESCRIPTION
    Starts the whole stack, waits until it is genuinely healthy, verifies it with
    real API calls, then opens the browser on a guided tour.

    Two modes:
      docker  PostgreSQL + FastAPI + nginx via docker compose  (production-like)
      local   uvicorn + vite with hot reload on SQLite         (fast, no Docker)

    'auto' (the default) picks docker when the daemon is running, otherwise local.

.PARAMETER Mode
    docker | local | auto      Default: auto

.PARAMETER Reseed
    Wipe and regenerate the demo data before starting.

.PARAMETER FastSeed
    With -Reseed, skip the ML pipeline. Much quicker, but dashboards are sparser.

.PARAMETER NoBrowser
    Start everything but do not open any browser tabs.

.PARAMETER Verify
    Also run the 131-assertion end-to-end check and report the result.

.PARAMETER Force
    When a required port is held by a process that does not look like this
    project, kill it anyway instead of refusing to start.

.PARAMETER Stop
    Shut down whatever this script previously started, then exit. Also reclaims
    ports 8000 / 5173 / 3000 in case an earlier run was left orphaned.

.EXAMPLE
    .\showcase.ps1
    Auto-detect, start, verify, open the browser.

.EXAMPLE
    .\showcase.ps1 -Mode local -Reseed -FastSeed
    Local hot-reload mode with fresh (quickly generated) demo data.

.EXAMPLE
    .\showcase.ps1 -Stop
    Tear everything down.
#>

[CmdletBinding()]
param(
    [ValidateSet('auto', 'docker', 'local')]
    [string]$Mode = 'auto',

    [switch]$Reseed,
    [switch]$FastSeed,
    [switch]$NoBrowser,
    [switch]$Verify,
    [switch]$Force,
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- constants
$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'
$VenvPython  = Join-Path $Root '.venv\Scripts\python.exe'
$SqliteFile  = Join-Path $BackendDir 'freshness.sqlite3'
$PidFile     = Join-Path $Root '.showcase-state.json'

$ApiUrl      = 'http://localhost:8000'
$DockerUrl   = 'http://localhost:3000'
$LocalUrl    = 'http://localhost:5173'

$DemoPassword = 'Demo@1234'
$DemoAccounts = @(
    @{ Role = 'Consumer';           Email = 'consumer@freshness.example.com';   Sees = 'Pantry, expiries, prominent Analyse Food flow' }
    @{ Role = 'Retail Manager';     Email = 'manager@freshness.example.com';    Sees = 'Stock quality, trends, waste risk, reports' }
    @{ Role = 'Warehouse Operator'; Email = 'warehouse@freshness.example.com';  Sees = 'Cold-chain compliance, temperature trends' }
    @{ Role = 'Quality Inspector';  Email = 'inspector@freshness.example.com';  Sees = 'Inspection queue, spoilage indicators' }
    @{ Role = 'Administrator';      Email = 'admin@freshness.example.com';      Sees = 'Users, system health, AI model provenance' }
)

# ------------------------------------------------------------------ output
function Write-Banner {
    param([string]$Text)
    Write-Host ''
    Write-Host ('=' * 74) -ForegroundColor DarkCyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host ('=' * 74) -ForegroundColor DarkCyan
}

function Write-Step   { param([string]$m) Write-Host "  -> $m" -ForegroundColor Gray }
function Write-Ok     { param([string]$m) Write-Host "  [ok]   $m" -ForegroundColor Green }
function Write-Warn2  { param([string]$m) Write-Host "  [warn] $m" -ForegroundColor Yellow }
function Write-Err2   { param([string]$m) Write-Host "  [fail] $m" -ForegroundColor Red }
function Write-Info   { param([string]$m) Write-Host "         $m" -ForegroundColor DarkGray }

# ------------------------------------------------------------------ helpers
function Test-DockerRunning {
    try {
        docker info *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Invoke-Native {
    <#
        Run an external command without letting its stderr output become a
        terminating PowerShell error.

        Tools like `docker compose` write ordinary progress to stderr, which
        $ErrorActionPreference = 'Stop' would otherwise treat as a failure. All
        output is appended to $LogFile; the real exit code is returned.
    #>
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory)][string]$LogFile,
        [string]$WorkingDirectory
    )

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $pushed = $false
    try {
        if ($WorkingDirectory) { Push-Location $WorkingDirectory; $pushed = $true }
        & $FilePath @Arguments *>> $LogFile
        return $LASTEXITCODE
    } finally {
        if ($pushed) { Pop-Location }
        $ErrorActionPreference = $previous
    }
}

function Show-LogTail {
    param([string]$LogFile, [int]$Lines = 25, [string]$Filter = '')
    if (-not (Test-Path $LogFile)) { return }
    $content = Get-Content $LogFile -ErrorAction SilentlyContinue
    if ($Filter) { $content = $content | Select-String -Pattern $Filter }
    $content | Select-Object -Last $Lines | ForEach-Object {
        Write-Host "     $_" -ForegroundColor DarkGray
    }
}

function Test-PortInUse {
    param([int]$Port)
    return $null -ne (Get-PortOwner -Port $Port)
}

function Get-PortOwner {
    <# Returns the process listening on $Port, or $null. #>
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                Select-Object -First 1
        if (-not $conn) { return $null }
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        return [pscustomobject]@{
            Port = $Port
            Pid  = $conn.OwningProcess
            Name = if ($proc) { $proc.ProcessName } else { 'unknown' }
        }
    } catch {
        return $null
    }
}

function Stop-PortOwner {
    <#
        Free a port by killing the process tree that listens on it.

        Only touches processes that plausibly belong to this project
        (python/uvicorn/node) unless -Force is used, so an unrelated service on
        port 8000 is never killed silently.

        Docker's own port forwarders (wslrelay, vpnkit, com.docker.backend) are
        NEVER killed - terminating them would break Docker Desktop itself. Those
        ports are released with `docker compose down` instead.
    #>
    param(
        [int]$Port,
        [switch]$Force
    )
    $owner = Get-PortOwner -Port $Port
    if (-not $owner) { return $true }

    if ($owner.Name -match '^(wslrelay|vpnkit|com\.docker|docker|dockerd|Docker Desktop)') {
        Write-Step ("port {0} is published by Docker ({1}) - releasing with compose down" -f `
            $owner.Port, $owner.Name)
        [void](Invoke-Native -FilePath 'docker' -Arguments @('compose', 'down') `
            -LogFile (Join-Path $Root '.showcase-docker.log') -WorkingDirectory $Root)
        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Milliseconds 500
            if (-not (Get-PortOwner -Port $Port)) {
                Write-Ok ("freed port {0} (Docker containers stopped)" -f $Port)
                return $true
            }
        }
        Write-Err2 ("port {0} is still published by Docker" -f $Port)
        Write-Info 'Another compose project may be using it. Check:  docker ps'
        return $false
    }

    $ours = $owner.Name -match '^(python|pythonw|uvicorn|node|nginx)'
    if (-not $ours -and -not $Force) {
        Write-Err2 ("port {0} is held by '{1}' (PID {2}), which does not look like this project" -f `
            $owner.Port, $owner.Name, $owner.Pid)
        Write-Info 'Stop it yourself, or re-run with -Force to kill it anyway.'
        return $false
    }

    try {
        Start-Process -FilePath 'taskkill' -ArgumentList '/PID', $owner.Pid, '/T', '/F' `
            -NoNewWindow -Wait -ErrorAction SilentlyContinue
    } catch { }

    # Give the OS a moment to release the socket.
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep -Milliseconds 400
        if (-not (Get-PortOwner -Port $Port)) {
            Write-Ok ("freed port {0} (was {1}, PID {2})" -f $owner.Port, $owner.Name, $owner.Pid)
            return $true
        }
    }
    Write-Warn2 ("port {0} is still held by PID {1}" -f $owner.Port, $owner.Pid)
    return $false
}

function Wait-ForUrl {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 180,
        [string]$Label = 'service'
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $spinner = '|/-\'
    $i = 0
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "`r" -NoNewline
                Write-Ok "$Label is up"
                return $true
            }
        } catch {
            # not ready yet
        }
        $remaining = [int]($deadline - (Get-Date)).TotalSeconds
        Write-Host ("`r  {0} waiting for {1}... ({2}s left)   " -f $spinner[$i % 4], $Label, $remaining) -NoNewline -ForegroundColor DarkGray
        $i++
        Start-Sleep -Milliseconds 900
    }
    Write-Host "`r" -NoNewline
    Write-Err2 "$Label did not become ready within ${TimeoutSeconds}s"
    return $false
}

function Save-State {
    param([hashtable]$State)
    $State | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8
}

function Get-State {
    if (Test-Path $PidFile) {
        try { return Get-Content $PidFile -Raw | ConvertFrom-Json } catch { return $null }
    }
    return $null
}

function Stop-Everything {
    Write-Banner 'STOPPING'
    $state = Get-State

    if ($state -and $state.Mode -eq 'local') {
        foreach ($name in @('BackendPid', 'FrontendPid')) {
            $processId = $state.$name
            if ($processId) {
                try {
                    # Kill the whole tree: the launcher window plus uvicorn/node.
                    Start-Process -FilePath 'taskkill' -ArgumentList '/PID', $processId, '/T', '/F' `
                        -NoNewWindow -Wait -ErrorAction SilentlyContinue
                    Write-Ok "stopped process tree $processId ($name)"
                } catch {
                    Write-Warn2 "could not stop PID $processId"
                }
            }
        }
    }

    if ((-not $state) -or $state.Mode -eq 'docker') {
        if (Test-DockerRunning) {
            Write-Step 'docker compose down'
            [void](Invoke-Native -FilePath 'docker' -Arguments @('compose', 'down') `
                -LogFile (Join-Path $Root '.showcase-docker.log') -WorkingDirectory $Root)
            Write-Ok 'containers stopped'
        }
    }

    # Belt and braces: reclaim the ports regardless of what the state file said.
    # This cleans up runs whose PIDs were never recorded (e.g. a second launch
    # that overwrote the state file, or a manually started uvicorn).
    $reclaimed = $false
    foreach ($port in @(8000, 5173, 3000)) {
        $owner = Get-PortOwner -Port $port
        if ($owner) {
            Write-Step ("port {0} still held by {1} (PID {2}) - reclaiming" -f $port, $owner.Name, $owner.Pid)
            [void](Stop-PortOwner -Port $port)
            $reclaimed = $true
        }
    }
    if (-not $reclaimed) { Write-Ok 'no leftover listeners on 8000 / 5173 / 3000' }

    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }
    Write-Host ''
    Write-Host '  Everything is shut down.' -ForegroundColor Green
    Write-Host ''
}

# ------------------------------------------------------------------- verify
function Invoke-ApiShowcase {
    <# Prove the running stack actually works, and print what is in it. #>
    Write-Banner 'VERIFYING THE RUNNING STACK'

    # --- health ---
    try {
        $health = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
    } catch {
        Write-Err2 'the API health endpoint is not responding'
        return $false
    }
    Write-Ok ("health: {0} | database: {1} | ML mode: {2}" -f $health.status, $health.database, $health.model)
    $runtime = ($health.components | Where-Object { $_.name -eq 'runtime' }).detail
    Write-Info "runtime: $runtime"
    Write-Info ("version {0} | environment {1} | demo_mode {2}" -f $health.version, $health.environment, $health.demo_mode)

    # --- login as admin ---
    $body = @{ username = 'admin@freshness.example.com'; password = $DemoPassword } | ConvertTo-Json
    try {
        $login = Invoke-RestMethod -Uri "$ApiUrl/api/v1/auth/login" -Method Post `
            -ContentType 'application/json' -Body $body -TimeoutSec 15
    } catch {
        Write-Err2 'could not sign in with the seeded admin account'
        Write-Info 'The database is probably not seeded. Re-run with -Reseed.'
        return $false
    }
    Write-Ok ("signed in as {0} ({1} permissions)" -f $login.user.role.name, $login.user.permissions.Count)
    $headers = @{ Authorization = "Bearer $($login.tokens.access_token)" }

    # --- what is in the database ---
    try {
        $p = Invoke-RestMethod -Uri "$ApiUrl/api/v1/analytics/platform" -Headers $headers -TimeoutSec 20
        Write-Host ''
        Write-Host '  Demo data loaded:' -ForegroundColor White
        Write-Info ("users {0} | categories {1} | products {2} | batches {3}" -f `
            $p.users.total, $p.catalogue.categories, $p.catalogue.products, $p.catalogue.batches)
        Write-Info ("AI analyses {0} | shelf-life predictions {1} | storage readings {2}" -f `
            $p.analysis.assessments, $p.analysis.shelf_life_predictions, $p.storage_readings)
        if ($p.analysis.average_processing_ms) {
            Write-Info ("mean analysis latency: {0} ms (measured, not estimated)" -f [math]::Round($p.analysis.average_processing_ms, 1))
        }
    } catch {
        Write-Warn2 'could not read platform statistics'
    }

    # --- model provenance (the honesty check) ---
    try {
        $models = Invoke-RestMethod -Uri "$ApiUrl/api/v1/system/models" -TimeoutSec 10
        Write-Host ''
        Write-Host '  AI model provenance:' -ForegroundColor White
        foreach ($role in $models.roles.PSObject.Properties) {
            $info = $role.Value
            $kind = if ($info.is_demo) { 'BASELINE' } else { 'TRAINED ' }
            $colour = if ($info.is_demo) { 'Yellow' } else { 'Green' }
            $metrics = if ($info.metrics.PSObject.Properties.Count -gt 0) { 'metrics recorded' } else { 'no accuracy claimed' }
            Write-Host ("         {0}  {1,-20} {2,-28} {3}" -f $kind, $role.Name, $info.name, $metrics) -ForegroundColor $colour
        }
    } catch {
        Write-Warn2 'could not read the model inventory'
    }

    return $true
}

# ----------------------------------------------------------------- summary
function Show-Tour {
    param([string]$AppUrl)

    Write-Banner 'DEMO ACCOUNTS'
    Write-Host ("  Password for every account: {0}" -f $DemoPassword) -ForegroundColor White
    Write-Host '  (the login page has one-click buttons, so you need not type them)' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host ("  {0,-20} {1,-34} {2}" -f 'ROLE', 'EMAIL', 'DASHBOARD SHOWS') -ForegroundColor DarkGray
    foreach ($a in $DemoAccounts) {
        Write-Host ("  {0,-20} {1,-34} {2}" -f $a.Role, $a.Email, $a.Sees)
    }

    Write-Banner 'SUGGESTED TOUR'
    $tour = @(
        'Sign in as the Consumer  -> personal pantry, "use these first", recent scans'
        'Click "Analyse Food"     -> pick a batch, drop in data\sample\mouldy_bread.jpg,'
        '                            enter 11 C and 95 %, then Analyse Freshness'
        'On the results page      -> read the "Why this score?" panel: it shows'
        '                            0.40 x Visual + 0.25 x Storage + 0.20 x Shelf-Life'
        '                            + 0.15 x Age, with each contribution in points'
        'Scroll to Visual         -> the overlay image with detected regions boxed'
        'Compare                  -> re-run with data\sample\fresh_tomato.jpg'
        'Switch to Retail Manager -> freshness trends, waste risk, value at risk'
        'Switch to Warehouse      -> compliance table, temperature trend vs the band'
        'Switch to Inspector      -> inspection queue and indicator frequency'
        'Switch to Administrator  -> users by role, system health, model provenance'
        'Open Reports             -> generate a PDF and an Excel file; both download'
        'Open Rotation            -> FIFO vs FEFO pick list, each row explains itself'
        'User menu -> About the AI models -> the honesty page'
    )
    foreach ($line in $tour) { Write-Host "  $line" -ForegroundColor Gray }

    Write-Banner 'URLS'
    Write-Host ("  Application  {0}" -f $AppUrl) -ForegroundColor White
    Write-Host ("  API          {0}" -f $ApiUrl)
    Write-Host ("  Swagger UI   {0}/docs" -f $ApiUrl)
    Write-Host ("  ReDoc        {0}/redoc" -f $ApiUrl)
    Write-Host ("  Health       {0}/health" -f $ApiUrl)
    Write-Host ("  Model info   {0}/api/v1/system/models" -f $ApiUrl)

    Write-Banner 'IMPORTANT: WHAT THE AI ACTUALLY IS'
    Write-Host '  No trained neural network ships with this project. All four inference' -ForegroundColor Yellow
    Write-Host '  roles are transparent computer-vision / rule baselines, and NO accuracy' -ForegroundColor Yellow
    Write-Host '  figures are claimed for them. Every result is labelled accordingly in' -ForegroundColor Yellow
    Write-Host '  the UI, and the "About the AI models" page states the provenance of each' -ForegroundColor Yellow
    Write-Host '  role. See ml/datasets/README.md to train real models.' -ForegroundColor Yellow

    Write-Banner 'TO STOP'
    Write-Host '  .\showcase.ps1 -Stop' -ForegroundColor White
    Write-Host ''
}

function Open-Tabs {
    param([string]$AppUrl)

    Write-Banner 'OPENING BROWSER'
    $tabs = @(
        @{ Url = $AppUrl;                                Why = 'the application (login screen)' }
        @{ Url = "$ApiUrl/docs";                         Why = 'Swagger UI - 100 documented endpoints' }
        @{ Url = "$ApiUrl/api/v1/system/models";         Why = 'live AI model provenance' }
        @{ Url = "$ApiUrl/health";                       Why = 'health check' }
    )
    foreach ($tab in $tabs) {
        Write-Step ("{0}  ({1})" -f $tab.Url, $tab.Why)
        Start-Process $tab.Url
        Start-Sleep -Milliseconds 700
    }
    Write-Ok 'browser tabs opened'
}

# =========================================================================
#  MAIN
# =========================================================================
if ($Stop) { Stop-Everything; exit 0 }

Write-Host ''
Write-Host '  AI FOOD FRESHNESS MONITORING PLATFORM' -ForegroundColor Cyan
Write-Host '  showcase launcher' -ForegroundColor DarkGray

# ---- resolve the mode ---------------------------------------------------
Write-Banner 'PREFLIGHT'

$dockerUp = Test-DockerRunning
if ($Mode -eq 'auto') {
    $Mode = if ($dockerUp) { 'docker' } else { 'local' }
    Write-Step ("auto-detected mode: {0}" -f $Mode)
    if ($Mode -eq 'local') { Write-Info 'Docker daemon is not running, so using local mode.' }
}

if ($Mode -eq 'docker' -and -not $dockerUp) {
    Write-Err2 'Docker mode requested but the Docker daemon is not running.'
    Write-Info 'Start Docker Desktop, or run:  .\showcase.ps1 -Mode local'
    exit 1
}

if ($Mode -eq 'local') {
    if (-not (Test-Path $VenvPython)) {
        Write-Err2 "Python virtual environment not found at $VenvPython"
        Write-Info 'Create it:  py -3.13 -m venv .venv'
        Write-Info '            .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt'
        exit 1
    }
    Write-Ok 'python venv found'

    if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
        Write-Err2 'frontend dependencies are not installed'
        Write-Info 'Install them:  cd frontend ; npm install'
        exit 1
    }
    Write-Ok 'frontend dependencies found'
}

$AppUrl = if ($Mode -eq 'docker') { $DockerUrl } else { $LocalUrl }

# ---- port check ---------------------------------------------------------
# A previous run of this script is the overwhelmingly likely cause of a busy
# port, so reclaim it automatically rather than prompting (which would also
# break non-interactive use, e.g. from the .bat launcher or a CI job).
$wantedPorts = if ($Mode -eq 'docker') { @(3000, 8000) } else { @(5173, 8000) }
$blocked = @()
foreach ($port in $wantedPorts) {
    $owner = Get-PortOwner -Port $port
    if (-not $owner) { continue }
    Write-Warn2 ("port {0} is in use by '{1}' (PID {2}) - probably an earlier run" -f `
        $port, $owner.Name, $owner.Pid)
    if (-not (Stop-PortOwner -Port $port -Force:$Force)) { $blocked += $port }
}

if ($blocked.Count -gt 0) {
    Write-Err2 ("could not free: {0}" -f ($blocked -join ', '))
    Write-Info 'Try:  .\showcase.ps1 -Stop      then run again'
    Write-Info 'Or:   .\showcase.ps1 -Force     to kill the holder regardless'
    exit 1
}
Write-Ok ("ports available: {0}" -f ($wantedPorts -join ', '))

$state = @{ Mode = $Mode; StartedAt = (Get-Date).ToString('o') }

# =========================================================================
#  DOCKER MODE
# =========================================================================
if ($Mode -eq 'docker') {
    Write-Banner 'STARTING THE STACK (docker compose)'
    Write-Info 'PostgreSQL 16 + FastAPI + nginx. First run also builds the images,'
    Write-Info 'applies Alembic migrations and seeds the demo data.'
    Write-Host ''

    $buildLog = Join-Path $Root '.showcase-docker.log'
    if (Test-Path $buildLog) { Remove-Item $buildLog -Force }

    if ($Reseed) {
        Write-Step 'removing existing volumes so the data is regenerated'
        [void](Invoke-Native -FilePath 'docker' -Arguments @('compose', 'down', '-v') `
            -LogFile $buildLog -WorkingDirectory $Root)
    }

    $env:SEED_ON_START = 'true'
    if (-not $env:JWT_SECRET_KEY) { $env:JWT_SECRET_KEY = 'showcase-local-secret' }

    Write-Step 'building images and starting containers (this can take a few minutes)'
    Write-Info "full build output: $buildLog"

    $code = Invoke-Native -FilePath 'docker' `
        -Arguments @('compose', 'up', '-d', '--build', '--wait', '--wait-timeout', '300') `
        -LogFile $buildLog -WorkingDirectory $Root

    if ($code -ne 0) {
        Write-Err2 "docker compose exited with code $code"
        Show-LogTail -LogFile $buildLog -Lines 25 -Filter 'ERROR|error:|unhealthy|failed'
        Write-Info "Full log: $buildLog"
        Write-Info 'Also try:  docker compose logs backend --tail 60'
        exit 1
    }
    Write-Ok 'containers started and reported healthy'

    Write-Host ''
    [void](Invoke-Native -FilePath 'docker' `
        -Arguments @('compose', 'ps', '--format', '  {{.Service}}  {{.State}}  {{.Status}}') `
        -LogFile $buildLog -WorkingDirectory $Root)
    Show-LogTail -LogFile $buildLog -Lines 4 -Filter 'running|exited|starting'

    if (-not (Wait-ForUrl "$ApiUrl/health" 180 'API')) {
        Write-Info 'Inspect the logs:  docker compose logs backend --tail 60'
        exit 1
    }
    if (-not (Wait-ForUrl $AppUrl 90 'frontend')) {
        Write-Info 'Inspect the logs:  docker compose logs frontend --tail 40'
        exit 1
    }
}

# =========================================================================
#  LOCAL MODE
# =========================================================================
if ($Mode -eq 'local') {
    # ---- seed if needed -------------------------------------------------
    $needsSeed = $Reseed -or -not (Test-Path $SqliteFile)
    if ($needsSeed) {
        Write-Banner 'SEEDING THE DEMO DATABASE'
        if ($Reseed) { Write-Info 'Reseeding: existing data will be dropped.' }
        else         { Write-Info 'No database found, so creating one.' }

        $seedArgs = @('-m', 'app.seed', '--reset')
        if ($FastSeed) {
            $seedArgs += '--no-analysis'
            Write-Info 'Fast mode: skipping the ML pipeline (dashboards will be sparser).'
        } else {
            Write-Info 'Running the real analysis pipeline on 44 batches - takes ~60-90s.'
        }
        Write-Host ''

        $env:PYTHONPATH = $BackendDir
        $seedLog = Join-Path $Root '.showcase-seed.log'
        if (Test-Path $seedLog) { Remove-Item $seedLog -Force }

        $code = Invoke-Native -FilePath $VenvPython -Arguments $seedArgs `
            -LogFile $seedLog -WorkingDirectory $BackendDir

        Show-LogTail -LogFile $seedLog -Lines 14 `
            -Filter 'Users |Categories |Products |Batches |Inventory |Images |assessments|predictions|readings|Recommendations|Alerts|Notifications'

        if ($code -ne 0 -or -not (Test-Path $SqliteFile)) {
            Write-Err2 'seeding failed'
            Show-LogTail -LogFile $seedLog -Lines 20
            Write-Info "Full log: $seedLog"
            exit 1
        }
        Write-Ok 'demo data ready'
    } else {
        $sizeMb = [math]::Round((Get-Item $SqliteFile).Length / 1MB, 1)
        Write-Ok "existing database found ($sizeMb MB) - use -Reseed for fresh data"
    }

    # ---- backend --------------------------------------------------------
    Write-Banner 'STARTING THE BACKEND (uvicorn, hot reload)'
    $backendCmd = @(
        "`$env:PYTHONPATH='$BackendDir'",
        "Set-Location '$BackendDir'",
        "Write-Host 'BACKEND - FastAPI on http://localhost:8000  (close this window to stop)' -ForegroundColor Cyan",
        "& '$VenvPython' -m uvicorn app.main:app --reload --port 8000"
    ) -join '; '

    $backend = Start-Process -FilePath 'powershell' `
        -ArgumentList '-NoExit', '-NoProfile', '-Command', $backendCmd `
        -WorkingDirectory $BackendDir -PassThru
    $state.BackendPid = $backend.Id
    Write-Step ("launched in its own window (PID {0})" -f $backend.Id)

    if (-not (Wait-ForUrl "$ApiUrl/health" 120 'API')) {
        Write-Info 'Check the backend window for a traceback.'
        Save-State $state
        exit 1
    }

    # ---- frontend -------------------------------------------------------
    Write-Banner 'STARTING THE FRONTEND (vite, hot reload)'
    $frontendCmd = @(
        "Set-Location '$FrontendDir'",
        "Write-Host 'FRONTEND - Vite on http://localhost:5173  (close this window to stop)' -ForegroundColor Cyan",
        'npm run dev'
    ) -join '; '

    $frontend = Start-Process -FilePath 'powershell' `
        -ArgumentList '-NoExit', '-NoProfile', '-Command', $frontendCmd `
        -WorkingDirectory $FrontendDir -PassThru
    $state.FrontendPid = $frontend.Id
    Write-Step ("launched in its own window (PID {0})" -f $frontend.Id)

    if (-not (Wait-ForUrl $AppUrl 120 'frontend')) {
        Write-Info 'Check the frontend window for an error.'
        Save-State $state
        exit 1
    }
}

Save-State $state

# =========================================================================
#  VERIFY, TOUR, OPEN
# =========================================================================
$healthy = Invoke-ApiShowcase
if (-not $healthy) {
    Write-Host ''
    Write-Warn2 'the stack started but verification failed - see the messages above'
}

if ($Verify) {
    Write-Banner 'END-TO-END CHECK (131 assertions)'
    Write-Info 'Exercises the entire specification workflow against the in-process app.'
    $env:PYTHONPATH = $BackendDir
    $smokeLog = Join-Path $Root '.showcase-e2e.log'
    if (Test-Path $smokeLog) { Remove-Item $smokeLog -Force }
    [void](Invoke-Native -FilePath $VenvPython -Arguments @('scripts\e2e_smoke.py') `
        -LogFile $smokeLog -WorkingDirectory $BackendDir)
    Get-Content $smokeLog | Select-String -Pattern 'E2E SMOKE|  FAIL' |
        ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
    Write-Info "Full output: $smokeLog"
}

Show-Tour -AppUrl $AppUrl

if (-not $NoBrowser) { Open-Tabs -AppUrl $AppUrl }

Write-Host ''
Write-Host ('=' * 74) -ForegroundColor DarkGreen
Write-Host (" READY - the platform is running in {0} mode" -f $Mode) -ForegroundColor Green
Write-Host (" Open {0} and sign in with any demo account." -f $AppUrl) -ForegroundColor Green
Write-Host ('=' * 74) -ForegroundColor DarkGreen
Write-Host ''
