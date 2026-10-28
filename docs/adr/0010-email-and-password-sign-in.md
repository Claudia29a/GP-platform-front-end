# ADR-010 Email and password sign-in next to Google, in a separate Account Service

**Status:** Accepted on 28 October 2026. Extends ADR-006 (Google Sign-In stays); refines ADR-004 (a fourth service).

## Context

ADR-006 made Google Sign-In the only way to sign in. Feedback from my teacher: not every patient has, or wants to use, a Google account, so CareBridge needs a second way to sign in with an email address and a password, with the accounts stored in a database. ADR-006 rejected a self-built auth service because password handling is the riskiest code in a health platform, so the risks have to be handled explicitly. Email verification and "forgot password" need an email provider, which is chosen in increment 4; they are left for later.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Accounts in the Intake Service | Nothing extra to host; one service less | Mixes login with triage; every future service would have to trust the Intake Service for identity; password data next to health data |
| A separate Account Service with its own database | One capability per service (ADR-004); password hashes live in their own database (ADR-005); other services only need its public key | One more service, database and pipeline |
| Keycloak with Google as one of its logins | Complete, standard identity server | One more container to host and maintain; much more to learn and configure for one extra sign-in method |

## Decision

A new **Account Service** (Spring Boot, ADR-003) with its own PostgreSQL database `account` and database user (ADR-005), its own folder, build and pipeline (ADR-009).

- **Sign-up** (`POST /accounts`): name, email and password. The password must have at least 8 characters, a capital letter and a number (the sign-up form shows the same rules), and at most 64 characters. It is stored only as a **BCrypt hash**. One account per email address, compared without capitals.
- **Sign-in** (`POST /login`): a correct password returns a **signed token** (JWT, RS256, valid 1 hour) with the same claims as a Google ID token: `sub`, `email`, `name`, `email_verified`. A wrong email and a wrong password get the same answer. After 5 wrong passwords the account is locked for 15 minutes.
- **Checking tokens:** the Account Service publishes its public key at `/.well-known/jwks.json`, as Google does. The Intake Service accepts tokens from both issuers and checks each with its own keys and rules; tokens from any other issuer are refused.
- **Roles:** as in ADR-006, from the staff allow-lists, whichever way someone signs in, but **only for a verified email address**. Google always verifies; a password account starts unverified, so it is a patient until email verification exists.
- **Signing key:** an RSA private key held only by the Account Service, as a secret in Azure.

## Consequences

People without a Google account can use CareBridge, and the other services stay unaware of passwords: they only check a signature. The cost is a fourth service with its own database and pipeline, and CareBridge now stores password hashes, so that database needs the same care as the health data. Until email verification exists, anyone can create an account with someone else's address; this cannot give them a staff role or another person's questions, because roles need a verified address and questions belong to the account's own ID. Email verification and "forgot password" are added in increment 4, recorded as an update to this ADR.
