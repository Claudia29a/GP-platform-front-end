# ADR-009 Two repositories: one for the front-end, one for the back-end services

**Status:** Accepted

## Context

Independent services should be built, tested and deployed independently. A change to the Appointment Service should not trigger a rebuild or redeploy of the Intake Service. At the same time, one developer works on all services and the Angular app. The front-end and the back-end use different tools: the Angular app is built with npm, the Java services with Gradle.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| One repository per service and one for the front-end | Independence is enforced by the repository boundary | Four repositories to keep in sync for one developer; shared documentation and configuration are spread out |
| One repository for everything, one shared build | Simplest setup | Every change rebuilds and redeploys everything, which undoes the independence of the services |
| One repository for everything, a folder per service and a separate pipeline per folder | One place for all code and documentation; each service still builds and deploys on its own | Mixes npm and Gradle tooling in one repository; front-end and back-end changes end up in one history |
| One repository for the front-end, one for the back-end with a folder per service and a separate pipeline per folder | Front-end and back-end each keep their own tooling and history; all Java services sit together with the same structure and build setup; each service still builds and deploys on its own | Discipline needed: no shared code between services except through their APIs |

## Decision

CareBridge uses two GitHub repositories. `carebridge-front-end` holds the Angular app. `carebridge-back-end` holds the three services, each in its own folder (`intake-service`, `messaging-service`, `appointment-service`). Each service folder has its own Gradle build and its own GitHub Actions workflow, triggered only when that folder changes. Services do not share Java modules with each other, and each deploys as its own Docker image to its own database (ADR-005).

## Consequences

The front-end and back-end each have a clean history and their own pipeline. All back-end services live in one place, which makes it easy to keep them consistent and to work on a feature that touches two services. The independence of the services comes from separate builds, deployments and databases, not from separate repositories. Unlike version 1, the back-end repository no longer means one shared database or one deployment unit. If a service ever needs its own team or release rhythm, it can move to its own repository without code changes.
