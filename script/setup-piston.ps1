[CmdletBinding()]
param(
  [string]$PistonApiUrl = "http://localhost:2000/api/v2"
)

$ErrorActionPreference = "Stop"

$apiUri = [Uri]$PistonApiUrl
if ($apiUri.Scheme -ne "http" -or $apiUri.Host -notin @("localhost", "127.0.0.1", "::1")) {
  throw "PistonApiUrl must refer to a local service such as http://localhost:2000/api/v2."
}
$baseUrl = $PistonApiUrl.TrimEnd("/")

function Get-RuntimeKey([string]$Name) {
  return ($Name.ToLowerInvariant().Replace("++", "pp") -replace "[^a-z0-9]", "")
}

function Find-InstalledRuntime($RuntimeList, $Aliases) {
  foreach ($runtime in $RuntimeList) {
    $names = @($runtime.language) + @($runtime.aliases)
    foreach ($name in $names) {
      if ((Get-RuntimeKey $name) -in $Aliases) { return $runtime }
    }
  }
  return $null
}

$targets = @(
  @{ Name = "Python"; Aliases = @("python", "python3"); Packages = @("python"); Required = $true },
  @{ Name = "C"; Aliases = @("c"); Packages = @("gcc", "c"); Required = $true },
  @{ Name = "C++"; Aliases = @("cpp"); Packages = @("gcc", "c++", "cpp"); Required = $true },
  @{ Name = "Java"; Aliases = @("java"); Packages = @("java"); Required = $true },
  @{ Name = "JavaScript"; Aliases = @("javascript", "js", "nodejs", "node"); Packages = @("node", "javascript", "nodejs"); Required = $true },
  @{ Name = "TypeScript"; Aliases = @("typescript", "ts"); Packages = @("typescript"); Required = $false },
  @{ Name = "R"; Aliases = @("r", "rscript"); Packages = @("r", "rscript"); Required = $false }
)

try {
  $runtimes = Invoke-RestMethod -Uri "$baseUrl/runtimes" -TimeoutSec 10
  $packages = Invoke-RestMethod -Uri "$baseUrl/packages" -TimeoutSec 10
} catch {
  throw "Could not reach Piston at $baseUrl. Start the local Piston container first. $($_.Exception.Message)"
}

foreach ($target in $targets) {
  if (Find-InstalledRuntime $runtimes $target.Aliases) {
    Write-Host "$($target.Name): runtime already installed."
    continue
  }

  $package = $packages |
    Where-Object { $_.language -in $target.Packages } |
    Sort-Object -Property @{ Expression = {
      try { [version]$_.language_version } catch { [version]"0.0" }
    } } -Descending |
    Select-Object -First 1

  if (-not $package) {
    if ($target.Required) {
      Write-Warning "$($target.Name): no installable package is listed by this Piston build."
    } else {
      Write-Host "$($target.Name): no compatible package is available; leaving it unsupported."
    }
    continue
  }

  Write-Host "Installing $($package.language) $($package.language_version) for $($target.Name)..."
  $body = @{
    language = $package.language
    version = $package.language_version
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "$baseUrl/packages" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 600 | Out-Null
  $runtimes = Invoke-RestMethod -Uri "$baseUrl/runtimes" -TimeoutSec 10
  if (-not (Find-InstalledRuntime $runtimes $target.Aliases)) {
    Write-Warning "$($target.Name): package installation completed, but Piston does not advertise a compatible runtime."
  }
}

$runtimes = Invoke-RestMethod -Uri "$baseUrl/runtimes" -TimeoutSec 10
$missing = @()
foreach ($target in $targets) {
  if (Find-InstalledRuntime $runtimes $target.Aliases) {
    Write-Host "$($target.Name): available"
  } elseif ($target.Required) {
    $missing += $target.Name
    Write-Warning "$($target.Name): not available"
  } else {
    Write-Host "$($target.Name): not available (optional)"
  }
}
if ($missing.Count -gt 0) {
  throw "Required runtimes are still missing: $($missing -join ', '). Check the Piston package catalog and logs."
}
