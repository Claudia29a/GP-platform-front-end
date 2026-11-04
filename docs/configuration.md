# Configuration per environment

Everything that differs between environments is a setting, not code. Moving CareBridge to another environment means setting the values below; no code changes and no new images.

A service or the front-end **refuses to start when a required setting is missing**, so a mistake shows up at deployment instead of as a wrong connection later.

## Settings

| Part | Setting | Secret | Where it is set on Azure |
| --- | --- | --- | --- |
| Intake Service | `INTAKE_DB_URL`, `INTAKE_DB_USER` | no | container app environment variable |
| Intake Service | `INTAKE_DB_PASSWORD`, `INTAKE_DATA_KEY` | **yes** | container app secret |
| Intake Service | `GOOGLE_CLIENT_ID` | no | container app environment variable |
| Intake Service | `ACCOUNT_JWKS_URI` | no | container app environment variable |
| Intake Service | `GP_EMAILS`, `ASSISTANT_EMAILS` | personal data | container app environment variable, never in git |
| Account Service | `ACCOUNT_DB_URL`, `ACCOUNT_DB_USER` | no | container app environment variable |
| Account Service | `ACCOUNT_DB_PASSWORD`, `ACCOUNT_TOKEN_PRIVATE_KEY`, `ACCOUNT_DATA_KEY` | **yes** | container app secret |
| Front-end | `API_URL`, `ACCOUNT_API_URL`, `GOOGLE_CLIENT_ID` | no | container app environment variable |
| Pipelines | `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `IMAGE_PREFIX` | no | GitHub repository variables |
| Pipelines | `SONAR_TOKEN` | **yes** | GitHub repository secret |

`ACCOUNT_TOKEN_ISSUER` is optional in both services; it must be the same in both, and the default is `carebridge-account-service`.

## Local

- **Docker Compose:** `.env` next to `docker-compose.yml` (not in git; `.env.example` shows the format).
- **`./gradlew bootRun`:** uses `application-local.properties`, which is only active on a laptop.
- **`npm start`:** uses `proxy.conf.json` and `public/config.json`.

## The front-end image

The Angular app contains no environment settings. When it starts, it reads `/config.json`, which nginx fills from the environment, so the same image runs everywhere. Its API paths (`/api`, `/api/account`) are relative to its own address, and nginx forwards them to `API_URL` and `ACCOUNT_API_URL`.

## What stays in the code on purpose

These do not change between environments:

- Google's public addresses (its keys, its issuer and its sign-in script).
- The Sonar organization and project keys, which name the project rather than an environment.

## Data keys

`INTAKE_DATA_KEY` and `ACCOUNT_DATA_KEY` encrypt and hash the personal data in each database. Each environment has its own keys, made with `openssl rand -base64 32`.

**Keep a safe copy of the production keys.** Without its key, the data in that database can never be read again, and changing a key needs a migration. The first start with a key converts existing data, so the key has to be set before the new version is deployed.
