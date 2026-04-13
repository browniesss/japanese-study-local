param(
  [string]$Region = "ap-chuncheon-1",
  [string]$ProfileName = "DEFAULT",
  [string]$ConfigLocation = "$env:USERPROFILE\.oci\config",
  [string]$OciExePath = "$env:APPDATA\Python\Python311\Scripts\oci.exe",
  [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = "Stop"
$Env:OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING = "True"

if (-not (Test-Path $OciExePath)) {
  throw "OCI CLI executable not found: $OciExePath"
}

$configDir = Split-Path -Parent $ConfigLocation
if (-not (Test-Path $configDir)) {
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $OciExePath
$null = $psi.ArgumentList.Add("setup")
$null = $psi.ArgumentList.Add("bootstrap")
$null = $psi.ArgumentList.Add("--region")
$null = $psi.ArgumentList.Add($Region)
$null = $psi.ArgumentList.Add("--config-location")
$null = $psi.ArgumentList.Add($ConfigLocation)
$null = $psi.ArgumentList.Add("--profile-name")
$null = $psi.ArgumentList.Add($ProfileName)
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi

if (-not $process.Start()) {
  throw "Failed to start OCI bootstrap process."
}

$buffer = New-Object System.Text.StringBuilder
$recentWindow = 6000
$start = Get-Date
$answeredCreate = $false
$answeredBrowser = $false
$answeredOverwrite = $false
$answeredPassphrase = $false

function Append-Chunk {
  param([string]$Chunk)
  if ([string]::IsNullOrEmpty($Chunk)) {
    return
  }

  [Console]::Write($Chunk)
  $null = $buffer.Append($Chunk)
  if ($buffer.Length -gt $recentWindow) {
    $null = $buffer.Remove(0, $buffer.Length - $recentWindow)
  }

  $snapshot = $buffer.ToString()

  if (-not $script:answeredCreate -and $snapshot -match "Do you want to create a new config file\? \[Y/n\]:") {
    $process.StandardInput.WriteLine("Y")
    $process.StandardInput.Flush()
    $script:answeredCreate = $true
    Write-Host "`n[bootstrap] answered: create config = Y"
  }

  if (-not $script:answeredBrowser -and $snapshot -match "Do you want to create your config file by logging in through a browser\? \[Y/n\]:") {
    $process.StandardInput.WriteLine("Y")
    $process.StandardInput.Flush()
    $script:answeredBrowser = $true
    Write-Host "`n[bootstrap] answered: browser login = Y"
  }

  if (-not $script:answeredOverwrite -and $snapshot -match "Do you want to overwrite your existing config file\? \[Y/n\]:") {
    $process.StandardInput.WriteLine("Y")
    $process.StandardInput.Flush()
    $script:answeredOverwrite = $true
    Write-Host "`n[bootstrap] answered: overwrite config = Y"
  }

  if (-not $script:answeredPassphrase -and $snapshot -match 'Enter a passphrase for your private key \("N/A" for no passphrase\):') {
    $process.StandardInput.WriteLine("N/A")
    $process.StandardInput.Flush()
    $script:answeredPassphrase = $true
    Write-Host "`n[bootstrap] answered: passphrase = N/A"
  }
}

while (-not $process.HasExited) {
  while ($process.StandardOutput.Peek() -ge 0) {
    Append-Chunk ([char]$process.StandardOutput.Read())
  }

  while ($process.StandardError.Peek() -ge 0) {
    Append-Chunk ([char]$process.StandardError.Read())
  }

  if (((Get-Date) - $start).TotalSeconds -gt $TimeoutSeconds) {
    try {
      $process.Kill()
    } catch {
    }
    throw "OCI bootstrap timed out after $TimeoutSeconds seconds."
  }

  Start-Sleep -Milliseconds 120
}

while ($process.StandardOutput.Peek() -ge 0) {
  Append-Chunk ([char]$process.StandardOutput.Read())
}

while ($process.StandardError.Peek() -ge 0) {
  Append-Chunk ([char]$process.StandardError.Read())
}

if ($process.ExitCode -ne 0) {
  throw "OCI bootstrap exited with code $($process.ExitCode)."
}

Write-Host "`n[bootstrap] completed successfully."
