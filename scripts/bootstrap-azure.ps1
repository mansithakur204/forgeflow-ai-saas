param(
  [string]$AzureAccount = "vgi.mrigank@gmail.com",
  [string]$ResourceGroup = "rg-forgeflow-ai-prod",
  [string]$Location = "centralindia",
  [string]$AppName = "forgeflow-ai-prod",
  [string]$CosmosAccountName = "forgeflow-ai-mongo",
  [string]$MongoDatabaseName = "forgeflow",
  [string]$ClerkPublishableKey = "",
  [string]$ClerkSecretKey = ""
)

$ErrorActionPreference = "Stop"

function Get-AzureCli {
  $command = Get-Command az -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $defaultPath = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
  if (Test-Path $defaultPath) { return $defaultPath }

  throw "Azure CLI is not installed or could not be found. Install it first: https://learn.microsoft.com/cli/azure/install-azure-cli"
}

$Az = Get-AzureCli

Write-Host "Opening Azure login for $AzureAccount ..."
& $Az login --username $AzureAccount | Out-Host

Write-Host "Creating resource group $ResourceGroup in $Location ..."
& $Az group create --name $ResourceGroup --location $Location | Out-Host

Write-Host "Deploying free-tier-oriented Azure resources ..."
& $Az deployment group create `
  --resource-group $ResourceGroup `
  --template-file "infra/main.bicep" `
  --parameters `
    location=$Location `
    appName=$AppName `
    cosmosAccountName=$CosmosAccountName `
    mongoDatabaseName=$MongoDatabaseName `
    enableCosmosFreeTier=true `
    clerkPublishableKey=$ClerkPublishableKey `
    clerkSecretKey=$ClerkSecretKey | Out-Host

Write-Host "Done. App Service URL:"
& $Az webapp show --resource-group $ResourceGroup --name $AppName --query "defaultHostName" --output tsv
