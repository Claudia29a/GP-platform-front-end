# ADR-001 Record architecture decisions

**Status:** Accepted

## Context

The previous architecture document fixed many technologies at once without explaining why. A reader could not tell which choices were essential and which were premature, and I could not easily revisit a choice later because the reasoning was never written down.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Keep all reasoning inside the architecture document | One place to read | Reasoning gets lost when the document is rewritten; history of changes is invisible |
| Lightweight ADRs, one per decision | Short, numbered, easy to reference; the history of a decision stays visible | A second document to maintain |
| No written decisions, rely on code and commits | No extra work | Reasons disappear; impossible to defend choices in an assessment |

## Decision

Every architecture decision is recorded as a short ADR in this document, using the template in the overview. The architecture document only states the result and refers to the ADR.

## Consequences

Each decision can be discussed on its own, and a changed decision leaves a trail (a new ADR supersedes the old one). It also forces me to take a decision only when I can argue it, which keeps premature choices out.
