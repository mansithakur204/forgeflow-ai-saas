param(
  [string]$AzureAccount = "vgi.mrigank@gmail.com",
  [Parameter(Mandatory = $true)]
  [string]$OrganizationUrl,
  [string]$ProjectName = "ForgeFlow AI",
  [string]$RepoName = "forgeflow-ai",
  [string]$PipelineName = "forgeflow-ai-ci-cd",
  [string]$RemoteName = "azure"
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

Write-Host "Ensuring Azure DevOps extension is installed ..."
& $Az extension add --name azure-devops --upgrade | Out-Host
& $Az devops configure --defaults organization=$OrganizationUrl project="$ProjectName" | Out-Host

Write-Host "Creating Azure DevOps project if needed ..."
$projectExists = & $Az devops project show --project "$ProjectName" --query name -o tsv 2>$null
if (-not $projectExists) {
  & $Az devops project create --name "$ProjectName" --visibility private | Out-Host
}

Write-Host "Creating Azure Repos repository if needed ..."
$repoUrl = & $Az repos show --repository "$RepoName" --query remoteUrl -o tsv 2>$null
if (-not $repoUrl) {
  $repoUrl = & $Az repos create --name "$RepoName" --query remoteUrl -o tsv
}

Write-Host "Configuring git remote '$RemoteName' ..."
if (git remote get-url $RemoteName 2>$null) {
  git remote set-url $RemoteName $repoUrl
} else {
  git remote add $RemoteName $repoUrl
}

Write-Host "Pushing current branch to Azure Repos ..."
$branch = git branch --show-current
git push -u $RemoteName $branch

Write-Host "Creating pipeline if needed ..."
$pipelineId = & $Az pipelines show --name "$PipelineName" --query id -o tsv 2>$null
if (-not $pipelineId) {
  & $Az pipelines create `
    --name "$PipelineName" `
    --repository "$RepoName" `
    --repository-type tfsgit `
    --branch $branch `
    --yml-path azure-pipelines.yml | Out-Host
}

Write-Host "Azure DevOps bootstrap complete."
