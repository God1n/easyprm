---
name: requirements-writing
title: Writing software functional requirements
when_to_use: Before writing or editing docs/sfr.md.
related: [user-story-writing, tech-doc-writing]
---

# Writing software functional requirements

sfr.md is the contract between what you promised (big-picture) and what you'll build (epics). Every line is a testable claim about user-visible behavior.

## The right level of abstraction

Requirements live between "the app does something useful" (too vague) and "the API endpoint returns 200 with JSON" (too specific). The right level: a QA engineer can write a test case from it without asking questions.

Good: "Users can invite team members by email. Invitees receive an email with a one-time link valid for 48 hours."
Bad: "User management functionality is implemented."
Also bad: "POST /invites accepts {email, role} and inserts a row into invitations table with expires_at = now() + 48h."

## Structure

Group requirements by functional area, not by component:

```
## Authentication
- REQ-AUTH-01: Users can register with email + password.
- REQ-AUTH-02: Users can reset their password via email.

## Projects
- REQ-PROJ-01: Users can create a project with a name and optional description.
```

Number every requirement (REQ-AREA-NN). You'll reference them in tasks.

## What belongs in sfr vs. trf

sfr = what the system does for the user. trf = how the system is built.
If a requirement mentions a database, an API, a library, or an algorithm — it belongs in trf.

## Smell tests

- Requirement uses "should" instead of "can" or "must" → too soft, make it concrete.
- Requirement contains "easily" or "quickly" → not testable, rewrite with a number.
- More than 30 requirements on first draft → you're writing implementation tasks, not requirements. Raise the level.

## Completeness check

For every success criterion in big-picture.md, there must be at least one requirement in sfr.md that, when implemented, would satisfy it. If you find a criterion with no matching requirement, either add the requirement or remove the criterion.
