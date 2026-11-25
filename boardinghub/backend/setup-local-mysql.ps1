param([string]$MySqlBin = 'C:/Program Files/MySQL/MySQL Server 8.0/bin')
$ErrorActionPreference = 'Stop'
$localRoot = Join-Path $PSScriptRoot '.local/mysql'
$dataDir = Join-Path $localRoot 'data'
$clientConfig = Join-Path $localRoot 'client.cnf'
$bootstrap = Join-Path $localRoot 'bootstrap.sql'
$utf8 = New-Object Text.UTF8Encoding($false)
$mysql = Join-Path $MySqlBin 'mysql.exe'
$mysqld = Join-Path $MySqlBin 'mysqld.exe'
if (!(Test-Path -LiteralPath $mysqld)) { throw 'MySQL server executable not found. Supply -MySqlBin.' }
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
if (!(Test-Path -LiteralPath $clientConfig)) {
    if (Test-Path -LiteralPath $dataDir) { throw 'Existing data directory without credentials; refusing to reinitialize.' }
    $rootPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $appPassword = [Guid]::NewGuid().ToString('N')
    [IO.File]::WriteAllText($clientConfig,"[client]`nhost=127.0.0.1`nport=3307`nuser=root`npassword=$rootPassword`n",$utf8)
    [IO.File]::WriteAllText($bootstrap,"ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword';`nCREATE DATABASE IF NOT EXISTS boardinghub CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`nCREATE USER IF NOT EXISTS 'boardinghub'@'localhost' IDENTIFIED BY '$appPassword';`nGRANT ALL PRIVILEGES ON boardinghub.* TO 'boardinghub'@'localhost';`n",$utf8)
    & $mysqld --no-defaults --initialize-insecure "--basedir=$([IO.Path]::GetDirectoryName($MySqlBin))" "--datadir=$dataDir"
    if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed. Inspect .local/mysql/data/*.err.' }
    $envPath = Join-Path $PSScriptRoot '.env'
    $existing = if (Test-Path -LiteralPath $envPath) { [IO.File]::ReadAllLines($envPath) | Where-Object { $_ -notmatch '^DB_(URL|USER|PASSWORD)=' } } else { @() }
    $existing += @('DB_URL=jdbc:mysql://127.0.0.1:3307/boardinghub?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true', 'DB_USER=boardinghub', "DB_PASSWORD=$appPassword")
    [IO.File]::WriteAllLines($envPath, [string[]]$existing, $utf8)
}
$listener = New-Object Net.Sockets.TcpClient
try { $listener.Connect('127.0.0.1',3307); $alreadyRunning = $true } catch { $alreadyRunning = $false } finally { $listener.Dispose() }
if (!$alreadyRunning) {
    $arguments = @('--no-defaults', "--basedir=`"$([IO.Path]::GetDirectoryName($MySqlBin))`"", "--datadir=`"$dataDir`"", '--port=3307', '--bind-address=127.0.0.1', '--mysqlx=0', "--log-error=`"$(Join-Path $localRoot 'server.err')`"")
    if (Test-Path -LiteralPath $bootstrap) { $arguments += "--init-file=`"$bootstrap`"" }
    Start-Process -FilePath $mysqld -ArgumentList $arguments -WindowStyle Hidden | Out-Null
}
$ready = $false
for ($attempt=0; $attempt -lt 40; $attempt++) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $databasePath = & $mysql "--defaults-extra-file=$clientConfig" --default-character-set=utf8mb4 --batch --skip-column-names -e 'SELECT @@datadir' 2>$null
    $ErrorActionPreference = $previousPreference
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
}
if (!$ready) { throw 'Local MySQL did not start. Inspect .local/mysql/server.err.' }
if ([IO.Path]::GetFullPath($databasePath.Trim()).TrimEnd('\','/') -ne [IO.Path]::GetFullPath($dataDir).TrimEnd('\','/')) {
    throw 'Port 3307 belongs to another MySQL instance; no changes were made to it.'
}
if (Test-Path -LiteralPath $bootstrap) { Remove-Item -LiteralPath $bootstrap }
Write-Host 'BoardingHub MySQL ready on 127.0.0.1:3307; application credentials saved in backend/.env.'
