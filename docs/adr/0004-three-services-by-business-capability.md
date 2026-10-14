# ADR-004 Three services split by business capability

**Status:** Accepted

## Context

Version 1 split the back-end into four services but let them share one database and one deployment unit, so they were not independent in practice. Services only pay off when their boundaries follow real differences: parts that change for different reasons, fail in different ways, or carry different load. At the same time, learning to design and justify service boundaries is an explicit goal of this project.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Monolith | Simplest to build, test and deploy; one database | An email-provider outage or a slow booking query affects the whole platform; offers no practice in service design |
| Modular monolith (modules in one deploy-able) | Clear internal boundaries with low operational cost | Modules still fail and scale together; boundaries are easy to break by accident |
| Four services including a self-built Identity/Auth Service (version 1) | Very fine-grained | Building login yourself is the riskiest part of a health platform; four services mean more infrastructure for one developer |
| Three services by business capability: Intake, Messaging, Appointment, with login handled externally | Each service maps to one step of the practice process; each can fail and scale on its own; the most security-sensitive part is not built in-house | More setup than a monolith: three pipelines, three databases, calls over the network |

## Decision

The back-end consists of three services, each owning one business capability: the Intake Service (submission, severity ordering, queue), the Messaging Service (GP replies and email), and the Appointment Service (links, slots, bookings). Accounts and login are delegated to an external identity provider (ADR-006).

**Why these three boundaries hold up:**

- *Different reasons to change:* triage and form rules (Intake), email content and provider (Messaging), practice opening hours and slot rules (Appointment).
- *Different failure impact:* if the email provider is down, patients can still submit questions and the GP assistant can still order the queue.
- *Different load:* submissions cluster when practices open in the morning, while bookings are rare; Intake can be scaled up without scaling the others.

## Consequences

Each service is deploy-able, testable and scalable on its own, which is the point of the architecture. The cost is network calls between services and more deployment work, so the number of services is kept at three until a new capability clearly needs its own boundary. If the extra infrastructure turns out to slow the project down too much, merging Messaging and Appointment into one service is the fallback; that would be recorded as a new ADR.
