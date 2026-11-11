# Configuration per environment

Everything that differs between environments is a setting, not code. Moving CareBridge to another environment means setting the values below; no code changes and no new images.

A service or the front-end **refuses to start when a required setting is missing**, so a mistake shows up at deployment instead of as a wrong connection later.

## Settings

Every setting has a priority: how bad it is when the value leaks or is lost. The higher the priority, the stronger the protection.

- **Critical:** a leak exposes patient data or lets someone act as any user; losing it loses data. Stored as a secret, with a backup outside the project.
- **High:** a leak gives access to a database or a service account. Stored as a secret.
- **Personal:** personal data, not a password. Stored as a secret, so it does not show in the Azure portal or in logs.
- **Public:** safe to show; it names something but gives no access.

| Setting | Part | Priority | Where it is set | Why |
| --- | --- | --- | --- | --- |
| `INTAKE_DATA_KEY` | Intake Service | Critical | Azure secret | Decrypts all questions; lost = questions unreadable |
| `ACCOUNT_DATA_KEY` | Account Service | Critical | Azure secret | Decrypts all names and email addresses |
| `ACCOUNT_TOKEN_PRIVATE_KEY` | Account Service | Critical | Azure secret | Signs sign-in tokens; leaked = anyone can pose as any user |
| `INTAKE_DB_PASSWORD` | Intake Service | High | Azure secret | Database access; the firewall also only allows Azure |
| `ACCOUNT_DB_PASSWORD` | Account Service | High | Azure secret | Database access; the firewall also only allows Azure |
| `SONAR_TOKEN` | Pipelines | High | GitHub secret | Can change the code quality results |
| `GP_EMAILS`, `ASSISTANT_EMAILS` | Intake Service | Personal | Azure secret | Who gets a staff role; never in git |
| `INTAKE_DB_URL`, `INTAKE_DB_USER` | Intake Service | Public | Azure variable | Useless without the password |
| `ACCOUNT_DB_URL`, `ACCOUNT_DB_USER` | Account Service | Public | Azure variable | Useless without the password |
| `ACCOUNT_JWKS_URI` | Intake Service | Public | Azure variable | Address of the public key |
| `GOOGLE_CLIENT_ID` | Intake Service, front-end | Public | Azure variable | Public by design: every browser sees it |
| `API_URL`, `ACCOUNT_API_URL` | Front-end | Public | Azure variable | Internal addresses of the services |
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `IMAGE_PREFIX` | Pipelines | Public | GitHub variable | Names, not passwords: Azure only accepts a deploy from this repository's `production` environment (OIDC) |

**When a setting is missing**, the service or front-end refuses to start. Two exceptions: empty staff lists make everyone a patient, and an empty `ACCOUNT_TOKEN_PRIVATE_KEY` makes a temporary key, which signs everyone out at each restart (only meant for a laptop).

**Local values** in `.env`, `application-local.properties` and the test settings are made-up values for a laptop or a test. They never open anything on Azure.

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
