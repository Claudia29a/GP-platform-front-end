# GDPR checklist

What CareBridge does today for each GDPR requirement, checked against the code and the Azure settings on 4 November 2026.

**Conclusion:** CareBridge is a student project and is **not ready for real patients**. Patients get a privacy page, are asked for permission, confirm their email address, and can see, download and delete their data; their data is encrypted in the database, and every time staff open a question it is recorded. Correcting details still goes through the practice, and nothing is deleted automatically yet. Until the gaps marked **must** are closed, the live site only holds made-up data.

This is a student's analysis, not legal advice. A real launch needs a privacy officer and the GP practice to confirm it.

**Status:** ✅ in place · 🟡 partly · ❌ gap · 📄 paperwork a real practice would need, no code

## The data

Health data is special category data (Article 9), the strictest kind. A question links it directly to a named person.

| Data | Where | Why it is needed | Kept for |
| --- | --- | --- | --- |
| Complaint area, duration, severity, symptoms, medication, treatment, description | Intake database, **encrypted** | The GP needs it to answer | No limit yet |
| Name and email on each question | Intake database, **encrypted** | Knowing whose question it is, and replying | No limit yet |
| Patient ID on each question | Intake database, **hashed** | Finding a patient's own questions | No limit yet |
| Severity score, queue position, status, time sent | Intake database, readable, because the database sorts on them | Ordering the queue | No limit yet |
| Permission: hashed user, version, time | Intake database | Proving the patient allowed it | Until withdrawn |
| Name, email | Account database, **encrypted** | Email sign-in | No limit yet |
| Whether the email is confirmed; hash of the confirmation code | Account database | Proving the address is real | The code hash: until used or replaced, at most 15 minutes valid |
| Hash of the IP address at sign-up | Account database | Stopping accounts being created in bulk | 1 hour |
| Access log: question ID, staff name (**encrypted**), staff ID (**hashed**), role, time | Intake database | Record of who opened which question | No limit yet; kept after the question is deleted, without patient data |
| Email for finding the account | Account database, **hashed** | Email sign-in | No limit yet |
| Password | Account database, **BCrypt hash** | Email sign-in | No limit yet |
| Failed sign-ins, lock time, created time | Account database, readable | Locking after wrong passwords | No limit yet |
| Staff email addresses | Azure settings, local `.env`; never in git | Deciding who has a staff role | Until removed by hand |
| IP addresses, requested URLs | Container logs in Azure Log Analytics | Finding faults | 30 days |
| Sign-in token | Browser `sessionStorage` | Staying signed in | Until the tab closes |
| Database backups (copies of all the above) | Azure, Sweden Central | Recovery | 7 days |

## Lawful and fair use

| Requirement | Status | Today | Still needed |
| --- | --- | --- | --- |
| Legal basis and Article 9 exception (Art. 6, 9) | ✅ | Patients give explicit permission in a popup before their first question; the back-end refuses a question without it | A real practice may use healthcare under professional secrecy, Art. 9(2)(h), instead. |
| Proof of permission, and withdrawing it (Art. 7) | ✅ | The version and time are stored, a new privacy text asks again, and the privacy page has a withdraw button | |
| Who is responsible (Art. 4, 26, 28) | 📄 | Not recorded | The practice would be the controller, CareBridge the processor, with a written agreement. |
| Telling people what happens to their data (Art. 12, 13) | ✅ | A privacy page, open to everyone, linked from sign-in, the footer and the popup | A real practice adds its name and contact details. |
| Only the data that is needed (Art. 5(1)(c)) | 🟡 | The form asks structured questions; the score and queue position are hidden from patients | The patient's own ID and email are repeated in every question and answer; free-text boxes invite more than is needed. |
| Correct data (Art. 5(1)(d)) | ✅ | Input is checked on the front-end and back-end; email addresses are confirmed with an emailed code before a question can be sent | |
| Storage limit (Art. 5(1)(e)) | ❌ **must** | Nothing is ever deleted | A retention period and an automatic clean-up. Dutch medical records are normally kept for 20 years, so the practice must decide what counts as part of the record. |

## Rights of the patient

| Right | Status | Today | Still needed |
| --- | --- | --- | --- |
| See their data (Art. 15) | ✅ | My data shows everything stored, including who opened each question | |
| Correct their data (Art. 16) | ❌ **must** | No way to edit a question, name or email | A way to correct details, or to ask the practice to. |
| Delete their data (Art. 17) | ✅ | Delete my account removes the account, questions and permission at once; backups clear after 7 days | A real practice must check the legal retention period for medical records first. |
| Take their data with them (Art. 20) | ✅ | Download my data gives one JSON file | |
| Limit or object (Art. 18, 21) | 📄 | No process | A contact address and a process at the practice. |
| Automated decisions (Art. 22) | ✅ | The severity score only orders the queue. Staff can overrule it and a person answers every question. The privacy page explains this. | |

## Security and privacy by design

| Requirement | Status | Today | Still needed |
| --- | --- | --- | --- |
| Access control (Art. 25, 32) | ✅ | Every question needs a token; patients only get their own; queue is staff only; staff need a verified email | |
| Need-to-know inside the practice (Art. 5(1)(f)) | 🟡 | Assistant and GP roles exist | Both see all health details; the practice must confirm the assistant needs that. |
| Passwords (Art. 32) | ✅ | BCrypt hash, password rules, lock after 5 wrong tries, same message for wrong email or password | |
| Encryption (Art. 32) | ✅ | HTTPS and TLS to the database. Answers, names and emails are also encrypted by the services (AES-256-GCM), so a copy of the database does not show them. Values that are only compared are hashed (HMAC-SHA-256). | The key is a single point of failure: keep a safe copy, and plan how to change it. |
| Secrets (Art. 32) | ✅ | Azure secrets and GitHub settings, never in git | |
| Known vulnerabilities (Art. 32) | ✅ | Trivy gate blocks deploys, weekly scan, Dependabot, SonarQube for own code | |
| Logs without health data (Art. 5, 32) | ✅ | The code writes no patient data to logs | Keep this rule when adding logging. |
| Network (Art. 32) | ❌ **must** | The services can be reached from the internet directly (measured on 4 November 2026), though data still needs a token. The database firewall accepts any Azure customer's server, though it still needs a password. | Close the service route; limit the database to CareBridge. |
| Who looked at a record (Art. 32) | ✅ | Every time staff open a question it is recorded; the GP sees it per question, the patient under My data | The queue overview is not logged per question; NEN 7513 asks more detail for a real practice. |
| Browser protection (Art. 32) | 🟡 | `nosniff`, frame blocking and referrer policy are set | Add a Content Security Policy. |
| Test data (Art. 25) | ✅ | Automated tests use made-up data | Keep the live site on made-up data as well. |

## Other companies and data leaving the EU

| Company | Role | Data | Status | Still needed |
| --- | --- | --- | --- | --- |
| Microsoft Azure | Hosting, database, logs | Everything above, in Sweden Central | 🟡 | Check that the data processing terms apply: this runs on a student subscription. |
| Google | Sign-in | Name, email; the sign-in page loads a Google script, which sends the visitor's IP address to Google even if they choose email | ❌ | Load the script only when someone chooses Google (the privacy page already says it happens); record the transfer outside the EU (Art. 44 to 46). |
| Email provider (to be chosen) | Sends the confirmation code | Email address and the code; never questions | 🟡 | Choose an EU-hosted provider and accept its data processing terms; the privacy page already names the service. |
| GitHub | Code and images | No patient data; test reports use made-up data | ✅ | |

## Accountability

| Requirement | Status | Still needed |
| --- | --- | --- |
| Record of processing (Art. 30) | 🟡 | The table at the top is a start; the practice keeps the official record. |
| Risk assessment, DPIA (Art. 35) | 📄 **must** | Needed before real use: new online handling of health data. |
| Data breach plan (Art. 33, 34) | 📄 **must** | Who decides, and how the authority is told within 72 hours. |

## Before the doctor's email feature

The next feature touches this checklist directly, so it starts with these rules:

1. **No health details in the email.** The email only says there is a reply and links to CareBridge, where the patient signs in. Email is not a safe place for health data.
2. **Verify email addresses first.** Done (Story 7): a password account confirms its address with an emailed code.
3. **The email provider is a new processor.** It needs data processing terms and, preferably, EU hosting, and has to be added to the privacy page and the table above.

## Work that follows from this

In order of importance. Each becomes a user story, with acceptance criteria and tests first.

1. Close the direct route to the services and limit the database firewall.
2. Correct my details.
3. Automatic clean-up after the retention period.
4. Load the Google script only on request; add a Content Security Policy.
