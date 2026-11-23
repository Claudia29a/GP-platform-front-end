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

## Story 6: privacy and consent

| Criterion | Proof |
| --- | --- |
| AC1 popup after signing in explains what happens and that the data is safe | `e2e` Story 6 AC1 · `component` privacy-consent.spec |
| AC2 Allow is remembered, and a question can be sent | `e2e` Story 6 AC2 · `unit` PrivacyConsentServiceTest |
| AC3 Do not allow signs out with an explanation | `e2e` Story 6 AC3 · `component` sign-in.spec |
| AC4 privacy page without signing in | `e2e` Story 6 AC4 · `component` privacy-page.spec |
| AC5 permission can be withdrawn | `e2e` Story 6 AC5 · `api` PrivacyConsentControllerTest |
| AC6 staff are not asked | `e2e` Story 6 AC6 · `unit` PrivacyConsentServiceTest |
| TAC1 back end refuses a question without permission | `e2e` Story 6 TAC1 · `unit` IntakeServiceTest |
| TAC2 database shows no answers, names or email addresses | `e2e` Story 6 TAC2 · `integration` IntakeRepositoryTest, AccountServiceIntegrationTest |
| TAC3 existing data is converted, nothing is lost | `integration` EncryptionMigrationIntegrationTest (both services) |
| TAC4 changed data or a wrong key is refused | `unit` DataProtectionTest (both services) |

## Story 7: email verification

Test types were chosen with the story, before the code was written.

| Criterion | Proof |
| --- | --- |
| AC1 after sign-up, the user is asked for the code | `e2e` Story 7 AC1 · `component` verify-email.spec |
| AC2 the emailed code confirms the address | `e2e` Story 7 AC2 · `api` AccountControllerTest · `integration` AccountServiceIntegrationTest |
| AC3 wrong code, new code and waiting get clear messages | `e2e` Story 7 AC3 · `component` verify-email.spec · `unit` VerificationServiceTest, account-api.service.spec |
| AC4 no question before the address is confirmed | `e2e` Story 7 AC4 TAC4 · `unit` auth.guards.spec |
| AC5 too many accounts from one device are refused | `e2e` Story 7 AC5 TAC5 · `component` sign-in.spec · `api` AccountControllerTest |
| AC6 Google users get no code | `unit` CurrentUserResolverTest, auth.guards.spec. Not `e2e`: the tests cannot sign in with a real Google account. |
| TAC1 random code, only a hash stored, expires after 15 minutes | `unit` VerificationServiceTest · `integration` AccountServiceIntegrationTest |
| TAC2 verify answers; 5 wrong tries; a code works once | `e2e` Story 7 TAC2 · `unit` VerificationServiceTest |
| TAC3 new code limits; nothing revealed for an unknown address | `e2e` Story 7 TAC3 · `unit` VerificationServiceTest |
| TAC4 the token says whether the address is verified; the Intake Service refuses otherwise | `e2e` Story 7 AC4 TAC4 · `api` IntakeControllerTest · `unit` CurrentUserResolverTest |
| TAC5 5 sign-ups an hour per IP, read from the platform's proxies | `e2e` Story 7 AC5 TAC5 · `unit` SignUpLimiterTest, ClientAddressTest |
| TAC6 SMTP settings, no health data, sending failure does not block | `unit` CodeMailerTest |
| TAC7 tests never send real email | `e2e` all, through Mailpit in `docker-compose.yml` |
| TAC8 the privacy page names the email service | `component` privacy-page.spec |

## Story 8: my data and the access log

Test types were chosen with the story, before the code was written.

| Criterion | Proof |
| --- | --- |
| AC1 My data shows details, permission and questions | `e2e` Story 8 AC1 · `component` my-data.spec · `unit` MyDataServiceTest, my-data.service.spec |
| AC2 download everything as one file | `e2e` Story 8 AC2 · `component` my-data.spec |
| AC3 delete after confirming; signed out with a message | `e2e` Story 8 AC3 · `component` my-data.spec, sign-in.spec · `unit` my-data.service.spec |
| AC4 opening a question is recorded | `e2e` Story 8 AC4 AC5 AC6 · `unit` AccessLogServiceTest, IntakeServiceTest |
| AC5 the GP sees who opened a question | `e2e` Story 8 AC4 AC5 AC6 · `component` intake-detail.spec |
| AC6 the download includes who opened the questions | `e2e` Story 8 AC4 AC5 AC6 · `unit` MyDataServiceTest |
| TAC1 own data only, from the token | `e2e` Story 8 TAC1 TAC4 · `api` MyDataControllerTest, AccountControllerTest · `unit` OwnTokensTest |
| TAC2 delete questions, permission and account; the queue closes up under the lock | `unit` MyDataServiceTest, QueueServiceTest, AccountServiceTest · `api` MyDataControllerTest · `integration` IntakeRepositoryTest, AccountServiceIntegrationTest |
| TAC3 staff name encrypted, ID hashed, log kept after deletion | `unit` AccessLogServiceTest · `integration` IntakeRepositoryTest |
| TAC4 only the GP reads the access log | `e2e` Story 8 TAC1 TAC4 · `api` MyDataControllerTest |
| TAC5 privacy page and checklist describe these rights | `component` privacy-page.spec |

## Story 9: stricter sign-up

Test types were chosen with the story, before the code was written.

| Criterion | Proof |
| --- | --- |
| AC1 an address whose domain cannot receive email is refused, with a message | `e2e` Story 9 AC1 · `component` sign-in.spec · `unit` MailDomainCheckerTest, account-api.service.spec · `api` AccountControllerTest |
| AC2 real mail domains can still sign up | `unit` MailDomainCheckerTest · `integration` DnsDomainResolverIntegrationTest |
| AC3 unconfirmed accounts are deleted after 24 hours; the address can sign up again | `e2e` Story 9 AC3 TAC3 · `unit` UnconfirmedAccountCleanerTest · `integration` AccountServiceIntegrationTest |
| AC4 the code screen and privacy page say so | `component` verify-email.spec, privacy-page.spec |
| TAC1 MX lookup; no domain, no MX and no address, or "MX 0 ." gives 422 | `unit` MailDomainCheckerTest · `integration` DnsDomainResolverIntegrationTest |
| TAC2 DNS not answering allows the sign-up | `unit` MailDomainCheckerTest |
| TAC3 the clean-up runs at start-up and every hour; confirmed accounts stay | `e2e` Story 9 TAC3 · `integration` AccountServiceIntegrationTest |
| TAC4 test domains are only skipped when the setting lists them | `unit` MailDomainCheckerTest |

## Story 10: faster start

Test types were chosen with the story, before the code was written. Start-up time was measured before and after,
locally with the same half CPU and 1 GB as on Azure (`Started … in … seconds`, three runs each):

| Service | Before | Class data sharing | Plus the quick compiler only |
| --- | --- | --- | --- |
| Account Service | 19.0 s | 10.5 s | 5.6 s |
| Intake Service | 17.2 s | 8.9 s | 4.3 s |

A sign-in stays as fast with the quick compiler only (median 0.11 s in both cases). On Azure, before the change, the
first sign-in right after starting took 26.8 s; after the change it takes 5.6 s. The start-up itself went from
27–29 s to 7.3–7.9 s.

| Criterion | Proof |
| --- | --- |
| AC1 the services start faster | `manual` measurement above, in the pipeline every image build makes the class archive |
| AC2 opening the sign-in page wakes both services at once | `e2e` Story 10 AC2 · `unit` wake-up.service.spec · `component` sign-in.spec |
| AC3 a long sign-in explains that CareBridge is starting | `component` sign-in.spec |
| TAC1 the class archive is made in the image with made-up settings, without a database | every Docker build; a failing practice start fails the build |
| TAC2 a service that cannot be woken shows no error; signing in shows the real message | `unit` wake-up.service.spec |

## Story 11: GDPR leftovers

Test types were chosen with the story, before the code was written.

| Criterion | Proof |
| --- | --- |
| AC1 questions older than 6 months are deleted; the queue closes up | `unit` QuestionCleanerTest · `integration` IntakeRepositoryTest |
| AC2 an email account corrects its name; empty and too-long names get a message | `e2e` Story 11 AC2 TAC3 · `component` my-data.spec · `api` MyDataControllerTest, AccountControllerTest |
| AC3 nothing loads from Google until the user chooses Google | `e2e` Story 11 AC3 · `component` sign-in.spec |
| AC4 a Content Security Policy, and every page works with it | `e2e` Story 11 AC4 |
| AC5 the services refuse requests that do not come through the website | `e2e` Story 11 AC5 TAC2 · `unit` GatewayFilterTest (both services) |
| TAC1 retention is a setting; the access log stays | `unit` QuestionCleanerTest |
| TAC2 secret header from nginx, checked in constant time; health checks and the public key stay open | `unit` GatewayFilterTest · `e2e` Story 11 AC5 TAC2 |
| TAC3 renaming updates the account and the questions, with a new token | `unit` MyDataServiceTest, AccountServiceTest, my-data.service.spec · `integration` IntakeRepositoryTest |
| TAC4 privacy page, checklist and settings document updated | `component` privacy-page.spec |

## Story 12: the doctor replies

Test types were chosen with the story, before the code was written. The replies live in a separate Messaging
Service with its own database (SAD v2).

| Criterion | Proof |
| --- | --- |
| AC1 the GP writes a reply; an empty one gets a message | `e2e` Story 12 AC1 AC2 AC3 · `component` intake-detail.spec · `api` ReplyControllerTest |
| AC2 the patient sees the reply on their question | `e2e` Story 12 AC1 AC2 AC3 · `component` intake-detail.spec |
| AC3 the patient gets an email without health details | `e2e` Story 12 AC1 AC2 AC3 · `unit` ReplyNotifierTest |
| AC4 only the GP replies; patients read only their own replies | `e2e` Story 12 AC4 · `api` ReplyControllerTest · `unit` ReplyServiceTest |
| TAC1 own service and database; replies stored encrypted | `integration` ReplyRepositoryTest |
| TAC2 access asked to the Intake Service with the user's token, not counted as opening the question | `unit` IntakeClientTest, ReplyServiceTest, IntakeServiceTest · `api` IntakeControllerTest |
| TAC3 a failed email does not lose the reply | `unit` ReplyNotifierTest |
| AC5 a patient who deletes their account also deletes the replies; My data shows and downloads them | `e2e` Story 12 TAC4 · `component` my-data.spec · `unit` my-data.service.spec, ReplyServiceTest · `api` MyRepliesControllerTest, MyDataControllerTest |
| TAC4 replies are deleted with their question: with the account, and 6 months after the question was sent | `e2e` Story 12 TAC4 · `unit` ReplyCleanerTest · `integration` ReplyRepositoryTest |

## User story nr 8: the GP view

From here on, story numbers follow the User Story document, and every commit starts with `user story nr <n>`.
Risk class A (BDTM): damage high, because a GP could miss an important detail; chance medium. Test types were
chosen with the story, before the code was written. No warning signs are shown: CareBridge does not decide what is
medically alarming, the urgency comes from the existing score.

| Criterion | Proof |
| --- | --- |
| AC1 the queue shows every question in the same fixed pattern, with only the first line of the question | `e2e` User story 8 AC1 · `component` queue-list.spec · `unit` queue.model.spec |
| AC2 staff see a summary at the top of the question page, then the question and the reply box | `e2e` User story 8 AC2 AC3, User story 8 AC2 · `component` intake-detail.spec |
| AC3 the other details are folded under "Full details" and open with a click or the keyboard | `e2e` User story 8 AC2 AC3 · `component` intake-detail.spec |
| AC4 nothing is lost; staff can still reach every answer | `component` intake-detail.spec · `e2e` Story 3 AC1 AC2 AC6 |
| AC5 the patient's page stays the same | `e2e` User story 8 AC5 · `component` intake-detail.spec |
| TAC1 `GET /queue` also returns the ticked symptoms, in form order; still staff only | `api` QueueControllerTest · `integration` QueueSymptomsIntegrationTest |
| TAC2 the folded part is the browser's own details element, so keyboard and screen readers work | `e2e` User story 8 AC2 AC3 · `component` intake-detail.spec |
| TAC3 the summary uses the existing answer labels | `unit` queue.model.spec · `component` queue-list.spec |
| TAC4 opening the page is still logged once | `unit` IntakeServiceTest · `e2e` Story 8 AC4 AC5 AC6 (the older "my data and the access log" story); the page only changed its layout |

## User story nr 9: the appointment link in the doctor's email

Risk class B (BDTM): damage medium, because a patient who needs care could miss the invitation or get a wrong link;
chance medium. Letting the GP type a link would make the damage high, so the link comes from the settings
(`APPOINTMENT_URL`) and the GP only ticks a box. Without a practice booking system, the link goes to CareBridge's
own simple appointment page.

| Criterion | Proof |
| --- | --- |
| AC1 the GP can tick "Invite the patient to make an appointment"; it is off at first | `e2e` User story nr 9 AC1 AC2 AC4 · `component` intake-detail.spec |
| AC2 with the tick, the email links to the booking page, still without health details | `e2e` User story nr 9 AC1 AC2 AC4 · `unit` ReplyNotifierTest |
| AC3 without the tick, the email is as before | `e2e` User story nr 9 AC3 · `unit` ReplyNotifierTest |
| AC4 the patient sees the invitation with a button to the booking page under that reply | `e2e` User story nr 9 AC1 AC2 AC4 · `component` intake-detail.spec, appointment-page.spec |
| AC5 only the GP can send an invitation | `e2e` User story nr 9 AC5 TAC3 · `api` ReplyControllerTest |
| TAC1 the invitation is stored encrypted with the reply; My data shows it | `integration` ReplyRepositoryTest · `unit` ReplyServiceTest · `api` MyRepliesControllerTest · `component` my-data.spec · `e2e` User story nr 9 TAC1 |
| TAC2 the booking link is a setting; only https (http only for localhost), otherwise no start | `unit` AppointmentLinkTest |
| TAC3 a link sent with the reply is ignored | `api` ReplyControllerTest · `e2e` User story nr 9 AC5 TAC3 · `unit` reply.service.spec |
| TAC4 a failed email keeps the reply and the invitation | `unit` ReplyServiceTest, ReplyNotifierTest |
