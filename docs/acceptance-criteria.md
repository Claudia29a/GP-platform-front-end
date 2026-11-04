# Acceptance criteria and their proof

Every criterion from the user stories, and what proves it. The stories are numbered in the order of the user story document.

**How the pipeline proves them:** on every push and pull request, the pipelines run the automated tests, then start the whole platform and run the end-to-end tests in a real browser. The deploy job only runs when everything passed. Each run page on GitHub shows an acceptance report, and the full report is attached to the run as `e2e-report`.

**Kinds of proof:** `e2e` real browser, services and database · `api` HTTP and security layer · `component` an Angular page · `unit` one class · `integration` real PostgreSQL · `manual` checked by hand, with the reason.

End-to-end tests are in `e2e/` in the front-end repository, named after their criterion, for example `Story 4 AC4`.

## Story 1: submit a question

| Criterion | Proof |
| --- | --- |
| AC1, AC2 type and submit | `e2e` Story 1 AC1 AC2 |
| AC3 see it is in review | `e2e` Story 1 AC3 |
| TAC1 authenticated POST | `e2e` Story 1 AC1 AC2 · `unit` intake.service.spec, auth.interceptor.spec |
| TAC2 back end checks input | `e2e` Story 1 TAC2 · `unit` SubmitIntakeRequestTest |
| TAC3 saved with ID, patient, time, "In review" | `e2e` Story 1 AC3 · `unit` IntakeServiceTest · `integration` IntakeRepositoryTest |
| TAC4 patient ID from the token | `api` IntakeControllerTest (patientSubmitsQuestionAsThemselves) |
| TAC5 read one, list oldest first | `e2e` Story 1 TAC5 |
| TAC6 no XSS or SQL injection | `e2e` Story 1 TAC6 (XSS). SQL goes through JPA with parameters; there is no separate attack test. |
| TAC7 tests for submit, empty, 401 | `e2e` Story 1 AC1 AC2, TAC2, TAC7 |

## Story 2: sign-in and roles

| Criterion | Proof |
| --- | --- |
| AC1 sign in with Google, sign out | `manual` Google blocks automated sign-in · `e2e` Story 2 AC1 (sign-out, with an email account) |
| AC2 roles from the staff lists | `e2e` Story 2 AC2 (three tests) · `unit` CurrentUserResolverTest |
| AC3 own questions, staff see all | `e2e` Story 2 AC3 |
| AC4 nothing without sign-in | `e2e` Story 2 AC4 |
| TAC1 Google, no password received | `manual` · design in ADR-006 |
| TAC2 token checks, 401 | `e2e` Story 2 TAC2 · `unit` GoogleTokenValidatorsTest, IssuerRoutingJwtDecoderTest |
| TAC3 role decided on the server | `e2e` Story 2 TAC3 · `unit` CurrentUserResolverTest |
| TAC4 role and ownership per endpoint | `e2e` Story 2 TAC4 · `api` QueueControllerTest, IntakeControllerTest · `unit` IntakeServiceTest |
| TAC5 protected routes | `e2e` Story 2 TAC5 · `unit` auth.guards.spec |
| TAC6 sign-out clears the session | `e2e` Story 2 AC1 · `unit` auth.service.spec · `manual` the account chooser appears |
| TAC7 secrets outside the code, HTTPS | `manual` docs/configuration.md lists every secret; the live site redirects HTTP to HTTPS |
| TAC8 the listed automated tests | `e2e` Story 2 AC2, AC4, TAC2, TAC4 · `unit` GoogleTokenValidatorsTest (expired token) |

## Story 3: structured question form

| Criterion | Proof |
| --- | --- |
| AC1, AC2, AC6 answers reach patient and practice | `e2e` Story 3 AC1 AC2 AC6 |
| AC3 yes needs text | `e2e` Story 3 AC3 |
| AC4 Other needs text | `e2e` Story 3 AC4 |
| AC5 nothing sent while incomplete | `e2e` Story 3 AC5 · `component` intake-form.spec |
| TAC1 fixed data model | `integration` IntakeRepositoryTest |
| TAC2 400 with an error per field | `e2e` Story 3 TAC2 · `api` IntakeControllerTest · `unit` SubmitIntakeRequestTest |
| TAC3 conditional rules, text ignored after no | `e2e` Story 3 TAC3 · `unit` IntakeServiceTest |
| TAC4 errors linked, focus moves | `e2e` Story 3 TAC4 · `component` intake-form.spec |
| TAC5 all answers stored and returned | `e2e` Story 3 AC1 AC2 AC6 |
| TAC6 the listed automated tests | `unit` SubmitIntakeRequestTest · `e2e` Story 3 AC5, TAC3 |

## Story 4: severity queue

| Criterion | Proof |
| --- | --- |
| AC1 score from 0 to 100 | `e2e` Story 4 AC1 AC2 · `unit` SeverityCalculatorTest |
| AC2 highest score first | `e2e` Story 4 AC1 AC2 |
| AC3 change the order, saved | `e2e` Story 4 AC3 (arrows) · `manual` dragging |
| AC4 never above a question moved by hand | `e2e` Story 4 AC4 · `unit` QueueServiceTest |
| AC5 refresh every 30 seconds and by button | `e2e` Story 4 AC5 (button) · `component` queue-list.spec (30 seconds) |
| AC6 patients see no queue or score | `e2e` Story 4 AC6 TAC9, Story 2 TAC5 |
| TAC1 score on the server, saved | `unit` IntakeServiceTest, SeverityCalculatorTest |
| TAC2 scoring has its own tests | `unit` SeverityCalculatorTest. The lowest possible score is 6, not 0, because the scale starts at 1. |
| TAC3 GET /queue, staff only | `e2e` Story 4 AC1 AC2, Story 2 TAC4 · `api` QueueControllerTest |
| TAC4 order and flag stored | `e2e` Story 4 AC3 · `unit` QueueServiceTest · `integration` IntakeRepositoryTest |
| TAC5 new question below moved ones | `e2e` Story 4 AC4 · `unit` QueueServiceTest |
| TAC6 two people at once | `integration` QueueConcurrencyIntegrationTest |
| TAC7 polling, stops when leaving | `component` queue-list.spec |
| TAC8 arrows and keyboard | `e2e` Story 4 TAC8 |
| TAC9 score never sent to patients | `e2e` Story 4 AC6 TAC9 · `api` IntakeControllerTest |

## Story 5: sign-in with email and password

| Criterion | Proof |
| --- | --- |
| AC1, AC2 create an account, rules shown | `e2e` Story 5 AC1 AC2 · `component` sign-in.spec |
| AC3 sign in as a patient | `e2e` Story 5 AC3 |
| AC4 clear message, nothing revealed | `e2e` Story 5 AC4 (four tests) · `unit` AccountServiceTest |
| AC5 locked after wrong passwords | `e2e` Story 5 AC5 · `unit` AccountServiceTest |
| AC6 Google still works | `manual` Google blocks automated sign-in · `e2e` settings test (client ID reaches Google's script) |
| TAC1 POST /accounts and /login | `e2e` Story 5 AC1 AC2, AC3 · `unit` account-api.service.spec |
| TAC2 back end checks input, 409 | `e2e` Story 5 TAC2 · `unit` RegisterRequestTest |
| TAC3 only a BCrypt hash | `unit` AccountServiceTest · `integration` AccountServiceIntegrationTest |
| TAC4 signed token, same 401, lock-out | `e2e` Story 5 AC4, AC5 · `unit` TokenServiceTest, AccountServiceTest |
| TAC5 public key, forged tokens refused | `e2e` Story 5 TAC5 · `integration` AccountServiceIntegrationTest · `unit` IssuerRoutingJwtDecoderTest |
| TAC6 identity from the token, staff need a verified address | `e2e` Story 5 TAC6 · `unit` CurrentUserResolverTest |
| TAC7 the listed automated tests | `e2e` Story 5 AC1 AC2, AC3, AC4, AC5, TAC2, TAC5 · `component` sign-in.spec |
