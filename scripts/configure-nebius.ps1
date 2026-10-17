$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$secretPath = Join-Path $projectDir '.dev.vars'
if (Test-Path -LiteralPath $secretPath) { Write-Host 'An existing .dev.vars file was found. Edit it locally to change the key.'; exit }
$secretValue = Read-Host 'Paste your Nebius Token Factory API key (hidden input)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretValue)
try {
  $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($plainValue) -or $plainValue.Contains("`n") -or $plainValue.Contains('"')) { throw 'Invalid key input.' }
  $content = 'NEBIUS_API_KEY="' + $plainValue + '"' + "`n" + 'NEBIUS_MODEL="nvidia/nemotron-3-super-120b-a12b"' + "`n" + 'NEBIUS_BASE_URL="https://api.tokenfactory.us-central1.nebius.com/v1"' + "`n"
  [IO.File]::WriteAllText($secretPath, $content)
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $plainValue = $null; $content = $null }
Write-Host 'Saved in the ignored .dev.vars file. Restart the local server to load it.'
