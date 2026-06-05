---
name: project-setup
title: Setting up a new project
when_to_use: After init_project, before drafting any project docs.
related: [big-picture-writing, requirements-writing, tech-doc-writing]
---

# Setting up a new project

The first 30 minutes of setup determines whether the project stays coherent for months — get the three doc trilogy right before touching a single ticket.

## The three-doc trilogy

Every easyprm project has exactly three docs drafted before any epic:

1. **big-picture.md** — what you're building and why, one page max. Who is it for, what problem it solves, what success looks like.
2. **sfr.md** (Software Functional Requirements) — the "what": user-facing features stated as requirements. No implementation details.
3. **trf.md** (Technical Reference) — the "how": tech stack choices, architecture decisions, constraints. References ADRs for non-obvious choices.

Draft them in order. If you can't fill sfr.md because big-picture is vague, the project is not ready to plan.

## Sizing check before you start

If the project will have fewer than 3 epics, you probably don't need easyprm — a single doc and a to-do list suffice. If it has more than 15 epics, your scope is too large; split into phases or separate projects now.

## Common mistakes

- Skipping the trilogy and jumping to epics. You will spend twice as long refactoring your ticket structure once requirements clarify.
- Writing trf.md before sfr.md. Technical choices without requirements are speculation. Write what first, then how.
- Treating big-picture as an internal memo nobody reads. It is the single source of truth you will return to when a scope debate erupts. Write it to be read.

## First-session checklist

- [ ] `init_project` run, `.claude/easyprm/` directory created
- [ ] `big-picture.md` drafted and saved with `write_doc`
- [ ] `sfr.md` drafted with at least 3 top-level requirements
- [ ] `trf.md` drafted with stack choice rationale
- [ ] First epic identified and named (not yet created)
