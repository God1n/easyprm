---
name: task-decomposition
title: Breaking an epic into tasks
when_to_use: After create_epic, before breaking it into tasks.
related: [user-story-writing, definition-of-done, dependency-mapping, estimating]
---

# Breaking an epic into tasks

A task is a unit of work one person can complete and hand off in a single session. If it takes more than a day, split it.

## The right size

Target 2–6 hours of focused work per task. Signals it's too big: you can't describe "What To Do" in under 10 bullet points. Signals it's too small: the setup and PR overhead will take longer than the work.

## How to split

Start from the epic's user story. Ask: "what are the distinct handoff points?" Each handoff is a task boundary.

Common split patterns:
- **Data model first** — schema + migrations, then API, then UI. Each is a task.
- **Happy path first** — implement the core flow as one task, then error handling as another.
- **Read before write** — if a feature reads and writes, the read-only version is often a shippable task on its own.

## Task naming

Use verb + noun: "Implement user invite endpoint," not "User invites" or "Invites feature." The verb makes the scope clear and the done state obvious.

## Dependency ordering

After listing tasks, draw the dependency graph mentally: which tasks block others? Set `depends_on` for every blocking relationship. A task with no dependencies can start immediately; a task with three dependencies might be a bottleneck. Surface bottlenecks now, not mid-sprint.

## Smell tests

- More than 15 tasks in one epic → probably two epics. Revisit epic-decomposition.
- Task description is "implement X" with nothing else → not a task, it's a wish. Add What To Do bullets.
- All tasks in an epic are sequential (long chain, no parallelism) → look for splits that can run in parallel. Long chains hide risk.

## Minimum viable task

Every task needs at minimum: a title, a one-line user story, and one How To Test bullet. If you can't write those, you don't understand the task yet.
