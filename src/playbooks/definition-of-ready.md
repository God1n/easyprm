---
name: definition-of-ready
title: Definition of ready — when to move a task to todo
when_to_use: Before moving a task from backlog to todo.
related: [definition-of-done]
---

# Definition of ready — when to move a task to todo

A task that enters "todo" without being ready will stall mid-execution, costing more time than the upfront planning would have.

## The readiness checklist

Before setting a task to `todo`, verify all of the following:

- [ ] **Title** is a verb + noun that makes the scope obvious.
- [ ] **User Story** is written: as a [specific user], I want to [action] so that [benefit].
- [ ] **What To Do** has at least 3 bullet points covering the core implementation steps.
- [ ] **How To Test** has at least 2 items, including one unhappy-path scenario.
- [ ] **Dependencies** are declared: either `depends_on` is set, or you've confirmed there are no blockers.
- [ ] The task fits in a single session (roughly ≤ 6 hours). If not, split it first.

## Why this matters

In solo AI-assisted development, the agent picks up tasks from the backlog and starts executing. A task that lacks "How To Test" means the agent has no success criterion — it will either over-engineer or stop prematurely. A task that lacks "What To Do" means the agent will interpret the scope however is convenient, not however you intended.

## What "backlog" means

Backlog = "we know this task exists but it's not ready to execute." Moving to `todo` is the commitment that you've thought it through. Moving to `in_progress` is the commitment that you're actively working on it.

## The shortcut that backfires

Creating tasks with only a title and immediately setting them to `in_progress` is tempting. It works for tiny tasks (under 30 minutes). For anything larger, you will stall, loop, or ship the wrong thing. Spend 5 minutes on DoR; save 45 minutes of rework.
