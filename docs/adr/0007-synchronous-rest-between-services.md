# ADR-007 Synchronous REST between services; no message broker yet

**Status:** Accepted

## Context

Version 1 introduced RabbitMQ for several flows, including one event (IntakeSubmitted) that no service consumed. The current flows need only two service-to-service calls: Messaging asks Appointment for a link, and Messaging marks an intake as answered in the Intake Service. Both happen while the GP is waiting for confirmation that the reply was sent.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Synchronous REST calls | Simple to build, test and debug; the GP gets an immediate success or error; no extra infrastructure | If the called service is down, the calling request fails and must be retried |
| Message broker (RabbitMQ) now | Services stay working when another is briefly down; one event can reach many consumers | Extra container to host and monitor; asynchronous flows are harder to test and debug; no current flow has more than one consumer |

## Decision

Services call each other over REST. The Angular app also calls each service over REST. A message broker is not introduced until a concrete trigger appears.

**Triggers to revisit.** A flow must keep working while another service is down (for example, replies being lost when the Appointment Service restarts); one event needs several consumers (for example audit logging); or retries become a real problem during testing. The reply flow in section 7.2 of the architecture document is the first candidate to move to asynchronous messaging.

## Consequences

Less infrastructure and easier debugging during the semester. The Messaging Service depends on the Appointment and Intake Services being up when a reply is sent; this is handled with a clear error and a retry option for the GP.
