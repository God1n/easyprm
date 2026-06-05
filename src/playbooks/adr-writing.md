---
name: adr-writing
title: Writing Architecture Decision Records
when_to_use: After making a non-obvious technical decision in any task.
related: [risk-identification]
---

# Writing Architecture Decision Records

An ADR is a 1-page record of a decision you made, why you made it, and what you rejected. You write it so future-you doesn't reverse the decision without understanding why it was made.

## When to write an ADR

Write an ADR when:
- You chose technology X over a reasonable alternative Y.
- You designed a data model with a non-obvious trade-off.
- You committed to an architectural pattern that constrains future choices.
- You made a performance, security, or scalability decision with known costs.

Do not write an ADR for: which color the button is, which variable name to use, or any decision that's trivially reversible with under an hour of work.

## The format

```markdown
# ADR-NNN: [Short title of the decision]

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by ADR-NNN

## Context
One paragraph. What situation forced this decision? What constraints apply?

## Decision
One sentence: "We will [decision]."

## Alternatives considered
- **[Option A]**: why rejected.
- **[Option B]**: why rejected.

## Consequences
- Positive: what this enables.
- Negative: what this costs or forecloses.
```

## Where to store ADRs

Save in `docs/adr/adr-NNN-short-title.md` using `write_doc`. Reference from trf.md under "Key decisions."

## The trap to avoid

Writing the ADR after the fact to justify a decision you already made emotionally. The discipline is in writing "Alternatives considered" before you commit. If you can't think of a reasonable alternative, either the decision is trivial (don't write an ADR) or you haven't looked hard enough.

## Superseding an ADR

When you reverse a decision, don't delete the old ADR — mark it "Superseded by ADR-NNN" and write a new one. The history of why you changed course is as valuable as the original decision.
