# Azure DevOps and Azure Hosting

This repo is prepared for an Azure DevOps-first deployment:

- Source control: Azure Repos
- CI/CD: Azure Pipelines
- Hosting: Azure App Service for Linux, Free F1 SKU
- Database: Azure Cosmos DB for MongoDB API, free tier enabled
- Runtime: Next.js standalone server artifact

## Free Tier Guardrails

The infrastructure defaults are intentionally small:

- App Service Plan uses `F1` / `Free`.
- Cosmos DB enables `enableFreeTier: true`.
- Cosmos DB database throughput is fixed at `400` RU/s.
- App Service `alwaysOn` is disabled because it is not supported on Free F1.

Azure allows only one Cosmos DB free-tier account per subscription. If your subscription already has one, the deployment can fail or create a billable account if you change `enableCosmosFreeTier`. Keep that setting `true` unless you intentionally upgrade.

## 1. Install Tools

Install:

- Azure CLI: https://learn.microsoft.com/cli/azure/install-azure-cli
- Git
- Node.js 20 LTS

After installing Azure CLI, scripts in `scripts/` will open the Microsoft login page for:

```powershell
vgi.mrigank@gmail.com
```

## 2. Create Azure Resources

Copy `infra/prod.parameters.example.json` if you want a saved parameter file, or run the script directly:

```powershell
.\scripts\bootstrap-azure.ps1 `
  -AzureAccount "vgi.mrigank@gmail.com" `
  -ResourceGroup "rg-forgeflow-ai-prod" `
  -Location "centralindia" `
  -AppName "forgeflow-ai-prod-yourinitials" `
  -CosmosAccountName "forgeflowmongo-yourinitials" `
  -ClerkPublishableKey "pk_test_..." `
  -ClerkSecretKey "sk_test_..."
```

App Service and Cosmos account names must be globally unique.

## 3. Create Azure DevOps Repo and Pipeline

Create or open an Azure DevOps organization, then run:

```powershell
.\scripts\bootstrap-azure-devops.ps1 `
  -AzureAccount "vgi.mrigank@gmail.com" `
  -OrganizationUrl "https://dev.azure.com/YOUR_ORG" `
  -ProjectName "ForgeFlow AI" `
  -RepoName "forgeflow-ai"
```

This creates the project/repo when possible, adds an `azure` git remote, pushes the current branch, and creates the YAML pipeline.

## 4. Pipeline Variables

In Azure DevOps, create these secret/non-secret pipeline variables or a variable group:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY` as secret

Create an Azure Resource Manager service connection named:

```text
forgeflow-ai-azure
```

The pipeline uses this service connection to create/update Azure resources and deploy the app.

## Notes

The current project is a single Next.js app. Its backend runs through the Next.js server runtime on App Service. If you later add a separate API service, add a second App Service or Azure Container App and extend `infra/main.bicep` plus `azure-pipelines.yml`.
