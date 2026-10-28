# ADR-006 Login with Google Sign-In (OpenID Connect)

**Status:** Accepted on 14 October 2026, after the increment 1 spike (see *Spike result*). Was: Proposed. Extended by [ADR-010](0010-email-and-password-sign-in.md): email and password sign-in next to Google.

## Context

Patients, GP assistants and GPs need accounts with different roles. Building login, password storage, password reset and account lockout by hand is the most security-critical code in a health platform and the easiest to get wrong. The platform must still know each user's role and, for patients, their email address. Google Sign-In was chosen to be investigated as the login method for all users.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Self-built Identity/Auth Service (version 1) | Full control | Password handling, resets and lockout all built in-house; a fourth service to deploy and secure |
| Google Sign-In | Most patients already have an account; no passwords stored by CareBridge; free | Gives identity only, no roles, so roles must be stored elsewhere; practice staff should not log in with personal Google accounts; privacy concerns about linking health use to a Google account |
| Keycloak (self-hosted, open source) | Standard OpenID Connect; roles, user management and social login (including Google) built in; runs in Docker, also locally | One more container to host and keep up to date |
| Managed provider (e.g. Auth0, Microsoft Entra External ID) | No hosting; standard OpenID Connect; free tiers | Free-tier limits and vendor lock-in; configuration differs per provider |

## Decision

Use Google Sign-In as the login method for patients and practice staff. The Angular app lets the user sign in with Google and sends the Google-issued ID token with every request. Each service validates that token with Spring Security as an OpenID Connect resource server and reads the user's Google ID and email address from it.

**How roles are handled.** Google only proves who someone is, not what they may do. Every user who signs in is a patient by default. GP assistants and GPs are recognised through a short allow-list of their email addresses with their role, kept in the services' configuration. Staff are asked to use a dedicated practice Google account, not a personal one.

**Why Google over the other options.** It removes all password handling from CareBridge, most patients can sign in without creating a new account, it is free, and it needs no extra container to host, which keeps the early deployment small. Keycloak and managed providers offer more features, such as built-in role management, but those are not needed for three roles and a handful of staff accounts.

**What the spike had to show.** A patient and a staff member can sign in with Google from the Angular app; the Intake Service accepts a valid Google token, rejects a missing or expired one, and gives staff access only to addresses on the allow-list; sign-in works both locally and on the deployed environment.

## Spike result

Increment 1 showed everything the spike had to show, both locally (Docker Compose) and on the deployed environment (Azure Container Apps):

- **Sign-in:** a patient, a GP assistant and a GP each signed in with Google from the Angular app and landed on the pages for their role.
- **Token validation:** the Intake Service accepts a token only when Google's signature is valid, it was issued by Google, it is meant for the CareBridge client, it has not expired and the email address is verified. A missing, invalid or expired token is answered with 401; after one hour the app asks the user to sign in again.
- **Roles:** staff rights are given only to addresses on the allow-lists (GP and GP assistant). Everyone else is a patient: a patient sees only their own questions, cannot open the practice queue (403), and practice staff cannot submit questions.
- **Configuration:** the allow-lists are environment variables of the service (locally a git-ignored `.env` file, on Azure container-app settings), so no staff email addresses are stored in the repositories.
- **Tests:** these rules are covered by automated tests in both repositories, which run in the CI pipeline on every push.

During the spike the Google client is in *Testing* mode, so only registered test accounts can sign in.

## Consequences

CareBridge stores no passwords, and login needs no extra service or container. The role allow-list is simple but must be updated by hand when staff change; if the practice grows, roles move to a proper user table or to Keycloak with Google as its login, recorded as a new ADR. Because the services only depend on the OpenID Connect standard, the provider can be swapped without rewriting service logic. Linking health use to a Google account is a privacy trade-off accepted for this learning project; a real Dutch healthcare product would likely require DigiD for patients.
