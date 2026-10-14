# CareBridge – Architecture Decision Records

CareBridge - Online GP Consultation Platform · Author: Cretu Claudia · Program: Semester 7 Open Learning

This document records every architecture decision for CareBridge: what was decided, which options were considered, and why. It is the companion to the Software Architecture Document v2, which refers to each decision by its number.

The same records are kept in both repositories (`docs/adr/`); a change to a decision is made in both. A changed decision gets a new ADR that supersedes the old one (ADR-001).

## Overview

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [ADR-002](0002-angular-single-page-application.md) | Angular single-page application as the front-end | Accepted |
| [ADR-003](0003-java-and-spring-boot.md) | Java and Spring Boot for the back-end services | Accepted |
| [ADR-004](0004-three-services-by-business-capability.md) | Three services split by business capability | Accepted |
| [ADR-005](0005-one-postgresql-database-per-service.md) | One PostgreSQL database per service | Accepted |
| [ADR-006](0006-login-with-google-sign-in.md) | Login with Google Sign-In | Accepted (14 October 2026, after the increment 1 spike) |
| [ADR-007](0007-synchronous-rest-between-services.md) | Synchronous REST between services; no message broker yet | Accepted |
| [ADR-008](0008-early-deployment-to-managed-container-platform.md) | Early deployment of Docker containers to a managed container platform | Accepted |
| [ADR-009](0009-two-repositories.md) | Two repositories: one for the front-end, one for the back-end services | Accepted |

## Template

Every ADR has the same parts: **Status**, **Context**, **Options considered** (with pros and cons), **Decision** and **Consequences**.
