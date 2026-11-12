param([int]$StartupTimeoutSeconds = 15)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$serverRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $serverRoot 'dist/main.js'))) {
  throw 'Build the server first with pnpm build.'
}

$portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$portProbe.Start()
$smokePort = $portProbe.LocalEndpoint.Port
$portProbe.Stop()

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = (Get-Command node).Source
$startInfo.Arguments = 'dist/main.js'
$startInfo.WorkingDirectory = $serverRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.EnvironmentVariables['PORT'] = [string]$smokePort
$smokeProcess = [System.Diagnostics.Process]::new()
$smokeProcess.StartInfo = $startInfo
$smokeClient = [System.Net.Http.HttpClient]::new()
$smokeClient.BaseAddress = [Uri]"http://127.0.0.1:$smokePort/"
$smokeClient.Timeout = [TimeSpan]::FromSeconds(3)
$smokeStarted = $false

function Send-SmokeRequest {
  param([string]$Method, [string]$Path, [int]$ExpectedStatus, [object]$RequestBody = $null)
  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $Path)
  $response = $null
  try {
    if ($null -ne $RequestBody) {
      $json = ConvertTo-Json -InputObject $RequestBody -Compress
      $request.Content = [System.Net.Http.StringContent]::new($json, [System.Text.Encoding]::UTF8, 'application/json')
    }
    $response = $smokeClient.SendAsync($request).GetAwaiter().GetResult()
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if ([int]$response.StatusCode -ne $ExpectedStatus) {
      throw "$Method $Path expected $ExpectedStatus but got $([int]$response.StatusCode): $text"
    }
    if ($ExpectedStatus -eq 204 -and $text.Length -ne 0) {
      throw 'A 204 response must have an empty body.'
    }
    if ($text.Length -gt 0) { return (ConvertFrom-Json -InputObject $text) }
  } finally {
    if ($null -ne $response) { $response.Dispose() }
    $request.Dispose()
  }
}

try {
  [void]$smokeProcess.Start()
  $smokeStarted = $true
  $stdoutTask = $smokeProcess.StandardOutput.ReadToEndAsync()
  $stderrTask = $smokeProcess.StandardError.ReadToEndAsync()
  $deadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
  $ready = $false
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($smokeProcess.HasExited) {
      throw "Server exited before startup: $($stderrTask.GetAwaiter().GetResult())"
    }
    try {
      $probe = $smokeClient.GetAsync('/').GetAwaiter().GetResult()
      try { $ready = [int]$probe.StatusCode -eq 200 } finally { $probe.Dispose() }
      if ($ready) { break }
    } catch { }
    Start-Sleep -Milliseconds 100
  }
  if (-not $ready) { throw 'Timed out waiting for the production server.' }

  $initialUsers = @(Send-SmokeRequest GET /users 200)
  if ($initialUsers.Count -ne 2) { throw 'Expected two initial users.' }
  $created = Send-SmokeRequest POST /users 201 @{ name = 'Smoke'; email = 'smoke@example.com' }
  if ($created.id -ne '3') { throw 'Unexpected new user ID.' }
  $patched = Send-SmokeRequest PATCH /users/3 200 @{ name = 'Renamed' }
  if ($patched.email -ne 'smoke@example.com') { throw 'PATCH cleared an omitted field.' }
  $replaced = Send-SmokeRequest PUT /users/3 200 @{ name = 'Replaced'; email = 'replaced@example.com' }
  if ($replaced.name -ne 'Replaced') { throw 'PUT did not replace the name.' }
  [void](Send-SmokeRequest PATCH /users/3 400 @{ name = 'Must not persist'; email = 7 })
  $unchanged = Send-SmokeRequest GET /users/3 200
  if ($unchanged.name -ne 'Replaced') { throw 'Invalid input changed stored data.' }
  [void](Send-SmokeRequest DELETE /users/3 204)
  [void](Send-SmokeRequest GET /users/3 404)
  Write-Output "Production smoke passed: real startup, CRUD, 400, 404 and empty 204 on port $smokePort."
} finally {
  $smokeClient.Dispose()
  if ($smokeStarted -and -not $smokeProcess.HasExited) {
    $smokeProcess.Kill()
    [void]$smokeProcess.WaitForExit(5000)
  }
  $smokeProcess.Dispose()
}
