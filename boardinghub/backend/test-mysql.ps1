param([string]$Maven='mvn.cmd',[string]$MySqlBin='C:/Program Files/MySQL/MySQL Server 8.0/bin')
$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$config=Get-Content -LiteralPath '.env' -Raw | ConvertFrom-StringData
$clientConfig=Join-Path $PSScriptRoot '.local/mysql/client.cnf'
if(!(Test-Path -LiteralPath $clientConfig)) { throw 'Run setup-local-mysql.ps1 first.' }
& (Join-Path $MySqlBin 'mysql.exe') "--defaults-extra-file=$clientConfig" --default-character-set=utf8mb4 -e "CREATE DATABASE IF NOT EXISTS boardinghub_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL PRIVILEGES ON boardinghub_test.* TO 'boardinghub'@'localhost';"
if($LASTEXITCODE -ne 0) { throw 'Could not prepare the isolated test database.' }
$env:RENTAL_MYSQL_TEST_URL=$config.DB_URL.Replace('/boardinghub?','/boardinghub_test?')
if($env:RENTAL_MYSQL_TEST_URL -notmatch '/boardinghub_test\?') { throw 'Refusing to test against a database other than boardinghub_test.' }
$env:RENTAL_MYSQL_TEST_USER=$config.DB_USER
$env:RENTAL_MYSQL_TEST_PASSWORD=$config.DB_PASSWORD
try { & $Maven '-Dmaven.repo.local=C:/Users/ngocn/.m2/repository' '-Dlogging.level.root=INFO' '-Dlogging.level.org.springframework=INFO' '-Dlogging.level.org.hibernate=INFO' -B '-Dtest=RentalMySqlIntegrationTest' test; $testExit=$LASTEXITCODE }
finally {
    Remove-Item Env:RENTAL_MYSQL_TEST_URL,Env:RENTAL_MYSQL_TEST_USER,Env:RENTAL_MYSQL_TEST_PASSWORD -ErrorAction SilentlyContinue
}
exit $testExit
