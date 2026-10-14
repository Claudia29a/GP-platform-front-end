# ADR-005 One PostgreSQL database per service

**Status:** Accepted

## Context

In version 1 all services shared one database. That couples them tightly: a table change for one service can break another, and services can read each other's data directly, so they are separate only on paper. Health data also calls for strict limits on which part of the system can see what. The hosting budget is a student budget, so running several paid database servers is not realistic.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| One shared database (version 1) | Simple joins and one connection string | Services are coupled through the schema; every service can read all health data; not a micro-services architecture |
| A separate database server per service | Strongest isolation | Three paid servers; more to manage than one developer needs |
| One database server, a separate database and user per service | Each service can only reach its own data; schema change independently; one server to pay for and manage | The server is a shared point of failure and shared capacity |

For the engine itself, PostgreSQL was chosen over MySQL and MongoDB. It is open source and free, is offered as a managed service by every major cloud provider, works directly with Spring Data JPA, and its JSON column type can store the symptom checklist without forcing a rigid table for every checkbox. A document database like MongoDB was not chosen because intakes, replies and bookings have a clear, stable structure that suits a relational model.

## Decision

Each service has its own PostgreSQL database with its own database user, which has rights only on that database. In the cloud the three databases run on one managed PostgreSQL server to stay within budget. No service ever queries another service's database; data from another service is only obtained through its API or from the access token.

## Consequences

Services can change their own tables without coordinating with the others, and a leaked credential for one service exposes only that service's data. Queries across services (for example "all intakes with their replies") cannot be done with a join and must be combined via API calls; this is acceptable because the screens need data from one service at a time. If one service's load starts to hurt the others, its database moves to its own server without any code change, only a new connection string.
