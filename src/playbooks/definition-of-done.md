---
name: definition-of-done
title: Definition of done — writing How To Test
when_to_use: When writing or reviewing the How To Test section of a task.
related: [definition-of-ready, user-story-writing]
---

# Definition of done — writing How To Test

"How To Test" is not QA instructions — it's the contract you make with yourself about what "done" means before you write a line of code.

## The rule

Every How To Test item must be a checkbox that a person (or an automated test) can evaluate as pass/fail without ambiguity. If you have to ask "does this count?" the item is too vague.

## Structure

Write 2–6 checkbox items. Each should:
1. State the precondition (what setup is needed).
2. State the action (what to do).
3. State the expected result (what should happen).

Template: `- [ ] Given [setup], when [action], then [expected result].`

## Examples

Good:
```
- [ ] Given a registered user, when they request password reset with their email, then they receive an email within 60 seconds.
- [ ] Given an expired reset link (>48h old), when a user clicks it, then they see "link expired" and are prompted to request a new one.
- [ ] Given an invalid email, when submitted, then the form shows a validation error and no email is sent.
```

Bad:
```
- [ ] Password reset works.
- [ ] Edge cases handled.
- [ ] Looks good on mobile.
```

## The unhappy path rule

For every happy-path item, add at least one unhappy-path item. If you only have happy-path items, you haven't thought about failure modes. The unhappy paths are where bugs live.

## When to write it

Write How To Test *before* implementing. It is your design document masquerading as a test checklist. If you can't write it, you don't understand what you're building.

## Relation to DoR

A task is "ready to start" (Definition of Ready) only when How To Test has at least two items, including one unhappy path. A task is "done" when all checkboxes are checked.
