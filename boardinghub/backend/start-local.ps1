$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$configPath = Join-Path $PSScriptRoot '.env'
if (!(Test-Path -LiteralPath $configPath)) {
    $randomBytes = New-Object byte[] 24
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
    $adminPassword = [Convert]::ToBase64String($randomBytes)
    @("BOARDINGHUB_ADMIN_EMAIL=admin@boardinghub.local", "BOARDINGHUB_ADMIN_PASSWORD=$adminPassword") |
        Set-Content -LiteralPath $configPath -Encoding UTF8
    Write-Host 'Created local administrator credentials in backend/.env (ignored by Git).'
}
foreach ($line in Get-Content -LiteralPath $configPath) {
    if ($line -match '^(BOARDINGHUB_ADMIN_EMAIL|BOARDINGHUB_ADMIN_PASSWORD|DB_URL|DB_USER|DB_PASSWORD)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
$javaCommand = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin/java.exe' } else { 'java' }
& $javaCommand -jar target/backend-0.1.0.jar --server.address=127.0.0.1 --logging.level.root=INFO --logging.level.org.springframework=INFO --logging.level.org.springframework.jdbc=INFO --logging.level.org.hibernate=INFO
exit $LASTEXITCODE
