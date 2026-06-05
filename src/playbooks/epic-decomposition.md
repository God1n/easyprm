---
name: epic-decomposition
title: Breaking a project into epics
when_to_use: After requirements are drafted, before create_epic.
related: [task-decomposition, user-story-writing]
---

# Breaking a project into epics

An epic is the smallest slice of value a user could in principle experience. If it has no user-visible outcome, it's a task pretending to be an epic.

## Three approaches

1. **User-journey slicing** — one epic per coherent user flow (sign-up, first-resource, billing). Default choice for product work.
2. **MVP slicing** — one epic per release wave. Pair with phases when a project has 3+ waves.
3. **Technical-stack slicing** (front-end / back-end / infra) — usually wrong for product work because no single epic delivers user value alone. Reserve for pure infra projects.

## Smell tests

- Epic has zero user-visible outcome → likely a task pretending to be an epic.
- Epic has 30+ tasks → probably two epics in a trenchcoat. Split by milestone or by user.
- Two epics share more than one common task → wrong seam, redraw.

## Common mistake

Sequencing epics by *layer* (DB → API → UI) instead of by *user value*. You will ship an unusable system and rebuild half of it. Slice vertically.
