@description('Short environment name used in resource names.')
param environmentName string = 'prod'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Globally unique Linux App Service app name.')
param appName string

@description('Azure Cosmos DB account name. Must be globally unique and lowercase.')
param cosmosAccountName string

@description('Mongo database name used by the application.')
param mongoDatabaseName string = 'forgeflow'

@description('Enable the Cosmos DB free tier. Only one free-tier Cosmos account is allowed per Azure subscription.')
param enableCosmosFreeTier bool = true

@description('Clerk publishable key. NEXT_PUBLIC values are baked into the Next.js client bundle during build.')
param clerkPublishableKey string = ''

@secure()
@description('Clerk secret key.')
param clerkSecretKey string = ''

var appServicePlanName = '${appName}-plan'
var appDefaultHostName = '${appName}.azurewebsites.net'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
    capacity: 1
  }
  kind: 'linux'
  tags: {
    environment: environmentName
    workload: 'forgeflow-ai'
  }
  properties: {
    reserved: true
  }
}

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosAccountName
  location: location
  kind: 'MongoDB'
  tags: {
    environment: environmentName
    workload: 'forgeflow-ai'
  }
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: enableCosmosFreeTier
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableMongo'
      }
    ]
    apiProperties: {
      serverVersion: '7.0'
    }
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

resource mongoDatabase 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: mongoDatabaseName
  properties: {
    resource: {
      id: mongoDatabaseName
    }
    options: {
      throughput: 400
    }
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  tags: {
    environment: environmentName
    workload: 'forgeflow-ai'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: false
      ftpsState: 'Disabled'
      appCommandLine: 'node server.js'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'HOSTNAME'
          value: '0.0.0.0'
        }
        {
          name: 'NEXT_TELEMETRY_DISABLED'
          value: '1'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'MONGODB_URI'
          value: cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'MONGODB_DB'
          value: mongoDatabaseName
        }
        {
          name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
          value: clerkPublishableKey
        }
        {
          name: 'NEXT_PUBLIC_APP_URL'
          value: 'https://${appDefaultHostName}'
        }
        {
          name: 'CLERK_SECRET_KEY'
          value: clerkSecretKey
        }
        {
          name: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL'
          value: '/login'
        }
        {
          name: 'NEXT_PUBLIC_CLERK_SIGN_UP_URL'
          value: '/signup'
        }
        {
          name: 'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL'
          value: '/dashboard'
        }
        {
          name: 'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL'
          value: '/dashboard'
        }
      ]
    }
  }
}

output appServiceName string = webApp.name
output appUrl string = 'https://${appDefaultHostName}'
output cosmosName string = cosmosAccount.name
output mongoDatabase string = mongoDatabase.name
