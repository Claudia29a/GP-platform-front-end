# ADR-002 Angular single-page application as the front-end

**Status:** Accepted

## Context

CareBridge has three roles (patient, GP assistant, GP) with very different screens: a long validated form, a sort-able queue with drag and drop, and a booking page that may only open with a valid link. All of them run in a browser; a mobile app is out of scope.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Angular | Complete framework: routing with route guards, reactive forms with validation, HTTP client and dependency injection built in; TypeScript by default; Angular CDK offers accessible drag and drop; commonly paired with Java back-ends in enterprise projects | Steeper learning curve and more boilerplate than lighter libraries |
| React | Very large ecosystem, flexible | Routing, forms and state need separate libraries that I would have to choose and justify one by one |
| Server-side rendering with Spring (Thymeleaf) | No separate front-end project | Harder to build an interactive drag-and-drop queue; ties the UI to one back-end service, which conflicts with a multi-service back-end |

## Decision

One Angular single-page application serves all three roles, with role-based route guards.

## Consequences

The features CareBridge needs most (route guards for the appointment link, reactive forms for the intake, drag and drop for the queue) come from the framework itself, so fewer extra libraries need their own justification. One app for all roles keeps a single code base; the trade-off is that role separation must be enforced in the back-end as well, not only by hiding screens.
