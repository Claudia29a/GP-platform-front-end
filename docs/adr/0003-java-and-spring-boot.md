# ADR-003 Java and Spring Boot for the back-end services

**Status:** Accepted

## Context

The back-end handles sensitive health data, validation rules, and a small number of REST APIs per service. It must run in containers, be testable with automated unit tests, and support secure token validation.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Java with Spring Boot | Mature standard for REST services; Spring Security has built-in OpenID Connect resource-server support; Spring Data JPA removes most database boilerplate; strong testing support (JUnit, MockMvc, Testcontainers); runs well in Docker | Higher memory use per service than lighter run-times; more configuration to learn |
| Node.js with Express or NestJS | Same language as the front-end; light and fast to start | Security and data access must be assembled from separate packages; weaker typing unless NestJS and TypeScript are used throughout |
| C# with ASP.NET Core | Comparable maturity to Spring | No advantage over Java for this project; would not build on the Java skills I want to deepen |

## Decision

Every back-end service is a Spring Boot application in Java, using Spring Web, Spring Data JPA and Spring Security.

## Consequences

The same structure is used in every service (controller, service, repository), so a second and third service are faster to build than the first. Token validation is configuration rather than custom code, which reduces security risk. Memory use per service is higher, which matters for hosting cost and is a reason to keep the number of services small (ADR-004).
