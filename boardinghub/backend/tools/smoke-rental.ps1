param([string]$BaseUrl='http://127.0.0.1:18080/api/v1')
$ErrorActionPreference='Stop'
if($BaseUrl -ne 'http://127.0.0.1:18080/api/v1') { throw 'This smoke test is restricted to the isolated test backend on port 18080.' }
$session=New-Object Microsoft.PowerShell.Commands.WebRequestSession
function Post-Command([string]$Path,[hashtable]$Data) {
    $csrf=Invoke-RestMethod "$BaseUrl/auth/csrf" -WebSession $session
    $headers=@{}; $headers[$csrf.headerName]=$csrf.token
    $json=if($Data){$Data|ConvertTo-Json -Depth 10}else{'{}'}
    Invoke-RestMethod "$BaseUrl/$Path" -Method Post -WebSession $session -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json))
}
function Require([bool]$Condition,[string]$Message) { if(!$Condition){throw $Message} }
$today=[TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,'SE Asia Standard Time').ToString('yyyy-MM-dd')
$previousMonth=([DateTime]::ParseExact($today,'yyyy-MM-dd',$null)).AddMonths(-1).ToString('yyyy-MM')
$email="smoke-$([Guid]::NewGuid().ToString('N'))@example.com"
$password=[Guid]::NewGuid().ToString('N')
$null=Post-Command 'auth/register-owner' @{fullName='Workflow Smoke';email=$email;password=$password}
$profile=Post-Command 'auth/login' @{email=$email;password=$password;accountType='OWNER'}
Require ($profile.role -eq 'OWNER') 'Owner login failed.'
$room=Post-Command 'rental/rooms' @{propertyName='Isolated API smoke';roomNumber='101';capacity='2'}
$person=Post-Command 'rental/persons' @{fullName='Test Tenant';phone='0901234567';accountEmail=''}
# String values and empty endDate deliberately match the browser form payload.
$contract=Post-Command 'rental/contracts' @{roomId=[string]$room.id;personId=[string]$person.id;startDate='2020-01-01';endDate='';rent='1000000';deposit='5000000';electricityPrice='3500';waterPrice='15000';servicePrice='100000'}
$cid=$contract.id
$null=Post-Command "rental/contracts/$cid/deposit" @{amount='5000000';reference='SMOKE-DEPOSIT';date=$today}
$null=Post-Command "rental/contracts/$cid/check-in" @{electricity='100';water='10';notes='Check-in handover'}
$null=Post-Command "rental/contracts/$cid/activate" @{}
$null=Post-Command "rental/contracts/$cid/activate" @{}
$period=Post-Command "rental/contracts/$cid/periods" @{period=$previousMonth;dueDate=$today}
$null=Post-Command "rental/periods/$($period.id)/readings" @{electricity='110';water='12'}
$invoice=Post-Command "rental/periods/$($period.id)/draft-invoice" @{}
$null=Post-Command "rental/invoices/$($invoice.id)/issue" @{}
$null=Post-Command 'rental/payments' @{invoiceId=[string]$invoice.id;amount='165000';reference='SMOKE-PAYMENT';date=$today}
$null=Post-Command "rental/periods/$($period.id)/lock" @{}
$checkout=Post-Command "rental/contracts/$cid/checkout" @{date=$today;electricity='115';water='13';finalRent='1000000';finalService='100000';notes='Checkout handover'}
$deduction=Post-Command "rental/checkouts/$($checkout.id)/deductions" @{description='Replace key';amount='100000'}
$null=Post-Command "rental/deductions/$($deduction.id)/approve" @{}
$state=Invoke-RestMethod "$BaseUrl/rental/state" -WebSession $session
$finalInvoice=$state.invoices|Where-Object kind -eq 'CHECKOUT'
$null=Post-Command "rental/invoices/$($finalInvoice.id)/issue" @{}
$null=Post-Command "rental/checkouts/$($checkout.id)/finalize" @{}
$null=Post-Command "rental/checkouts/$($checkout.id)/finalize" @{}
$state=Invoke-RestMethod "$BaseUrl/rental/state" -WebSession $session
Require ($state.contracts[0].status -eq 'TERMINATED') 'Contract not terminated.'
Require ($state.rooms[0].status -eq 'VACANT') 'Room not vacated.'
Require ($state.checkouts[0].applied_amount -eq 2232500) 'Deposit allocation is incorrect.'
Require ($state.checkouts[0].refund_amount -eq 2767500) 'Refund is incorrect.'
Require ($state.deposit_transactions.Count -eq 3) 'Settlement recorded more than once.'
Require (@($state.invoices|Where-Object {[decimal]$_.balance -ne 0}).Count -eq 0) 'An invoice remains unpaid.'
Require ([string]$state.contracts[0].start_date -like '2020-01-01*') 'Date serialization is incorrect.'
$null=Post-Command 'auth/logout' @{}
Write-Output 'HTTP lifecycle passed: owner login, form JSON, check-in, billing, partial payment, deduction, deposit settlement and idempotency. Application database unchanged.'
