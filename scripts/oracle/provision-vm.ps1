param(
  [Parameter(Mandatory = $true)][string]$CompartmentId,
  [Parameter(Mandatory = $true)][string]$AvailabilityDomain,
  [Parameter(Mandatory = $true)][string]$SubnetId,
  [Parameter(Mandatory = $true)][string]$ImageId,
  [Parameter(Mandatory = $true)][string]$SshPublicKeyPath,
  [Parameter(Mandatory = $true)][string]$AppGitUrl,
  [string]$AppGitRef = "main",
  [string]$InstanceName = "japanese-study-app",
  [decimal]$Ocpus = 1,
  [decimal]$MemoryInGBs = 6
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$templatePath = Join-Path $PSScriptRoot "cloud-init.yaml"
$tempDir = Join-Path $root ".oracle-tmp"
$userDataPath = Join-Path $tempDir "cloud-init.rendered.yaml"

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$template = Get-Content $templatePath -Raw
$rendered = $template.Replace("__APP_GIT_URL__", $AppGitUrl).Replace("__APP_GIT_REF__", $AppGitRef)
Set-Content -Path $userDataPath -Value $rendered -Encoding utf8

$shapeConfig = "{`"ocpus`":$Ocpus,`"memoryInGBs`":$MemoryInGBs}"

$launchJson = oci compute instance launch `
  --compartment-id $CompartmentId `
  --availability-domain $AvailabilityDomain `
  --display-name $InstanceName `
  --shape "VM.Standard.A1.Flex" `
  --shape-config $shapeConfig `
  --subnet-id $SubnetId `
  --image-id $ImageId `
  --assign-public-ip true `
  --ssh-authorized-keys-file $SshPublicKeyPath `
  --user-data-file $userDataPath `
  --wait-for-state RUNNING `
  --max-wait-seconds 1800

$instance = $launchJson | ConvertFrom-Json
$instanceId = $instance.data.id

Start-Sleep -Seconds 8

$vnicJson = oci compute instance list-vnics --instance-id $instanceId
$vnic = ($vnicJson | ConvertFrom-Json).data | Select-Object -First 1

Write-Output "INSTANCE_ID=$instanceId"
Write-Output "PUBLIC_IP=$($vnic.'public-ip')"
Write-Output "APP_URL=http://$($vnic.'public-ip')/"
