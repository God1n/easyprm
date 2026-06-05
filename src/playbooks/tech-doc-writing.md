---
name: tech-doc-writing
title: Writing the technical reference doc
when_to_use: Before writing or editing docs/trf.md.
related: [epic-decomposition]
---

# Writing the technical reference doc

trf.md is where you commit to choices and explain why — so you don't relitigate them in every epic's technical summary.

## Required sections

1. **Stack** — list every major technology with a one-line rationale. "PostgreSQL — relational data model, strong JSONB support, used for 5+ years." No rationale = no commit.
2. **Architecture overview** — 3–8 sentences or a diagram reference. Describe data flow and system boundaries. Where does data enter? How does it move? Where does it exit?
3. **Key decisions** — link or inline ADRs for any non-obvious choice. If you chose X over Y, say why. Future self will forget.
4. **Constraints** — budget, legal, existing infrastructure, performance requirements. Things that rule out solutions before you start.
5. **Out of scope** — technical things you are NOT building in this phase (e.g., "no mobile app," "no real-time sync").

## What counts as a non-obvious choice

Any choice where a reasonable senior engineer might disagree or ask "why not Z?" needs a rationale. Choosing React when you already have a React codebase does not. Choosing React for a new project when Svelte is lighter for your use case does.

## Architecture diagram

If you write trf.md and the project has more than 3 interacting components, sketch a diagram in the body. easyprm's overview will render it. Use markdown fenced blocks:

```
```mermaid
graph LR
  user --> frontend --> api --> db
```
```

## Smell tests

- trf.md written before sfr.md → technical choices without requirements. Stop. Write sfr first.
- Stack section lists technologies without rationale → you're cargo-culting. Add why.
- No constraints section → you haven't thought about what's off the table. Add it now.
- trf is longer than sfr → you're over-engineering the plan. Cut technical detail that belongs in task descriptions.
