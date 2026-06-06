---
name: adr-writing
title: Writing Architecture Decision Records
when_to_use: After making a non-obvious technical decision in any task.
related: [risk-identification]
---

# Writing Architecture Decision Records

Write an ADR any time you make a non-obvious technical decision — one that would confuse a competent engineer six months from now if they saw it without context.

## When to write an ADR

Write one when you chose technology X over a reasonable alternative Y, designed a data model with a non-obvious trade-off, committed to a pattern that constrains future choices, or accepted a known performance or security cost. Do not write an ADR for a trivially reversible decision (under an hour to undo) or for style-level choices.

## The three required sections

**Context** — One paragraph. What situation forced this decision? What constraints, deadlines, or prior choices made certain options unavailable? This is not a justification; it is a neutral description of the world as it was.

**Decision** — One sentence starting with "We will…". State the choice, not the reasoning. The reasoning belongs in Context and Consequences.

**Consequences** — Two sub-lists: what this enables (positive) and what this costs or forecloses (negative). Be honest about the costs. An ADR with no negative consequences wasn't a hard decision.

## Calling `add_decision`

```
add_decision({
  title: "Use SQLite for local task storage",
  context: "We need durable storage with zero external dependencies for a CLI tool. PostgreSQL and MySQL require a running server. Redis is not relational.",
  decision: "We will use SQLite via the better-sqlite3 driver for all persistent state.",
  consequences: "Positive: zero-dependency install, single-file backup. Negative: no concurrent write access; unsuitable if multi-process writes become required.",
  // optional:
  epic: "task-persistence",
  supersedes: "0003",
  status: "accepted"
})
```

The tool assigns an auto-incrementing ID and writes the record to `decisions/0001-<slug>.md`. You never pick the path manually.

## Superseding an ADR

When you reverse a decision, do not delete the old record. Call:

```
update_decision({ id: "0001", status: "superseded", supersedes: "0007" })
```

Then write a new ADR explaining what changed and why. The history of reversals is as valuable as the original decision — future engineers need to know you tried this path and turned back.

## The trap to avoid

Writing the ADR after the fact to justify a decision you already made emotionally. The discipline is in writing the Context and Consequences sections before you commit. If you cannot name a reasonable alternative you rejected, either the decision is trivial (skip the ADR) or you have not looked hard enough.
