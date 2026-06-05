---
name: estimating
title: Estimating timelines and effort
when_to_use: When the user asks for a timeline, or when prioritising work for a phase.
related: [task-decomposition, risk-identification]
---

# Estimating timelines and effort

Estimation is not prediction — it's a forcing function to surface what you don't know. The number you produce is less important than the conversation the exercise forces.

## How to estimate a task

1. Break it into What To Do bullets if you haven't already. You can't estimate what you haven't decomposed.
2. Assign each bullet a rough duration: trivial (< 30 min), small (30 min–2 h), medium (2–6 h), large (> 6 h, split this).
3. Sum and add 30% for integration, testing, and unexpected friction.
4. If any single bullet is "large," split the task before committing.

## How to estimate a project phase

Sum task estimates within the phase. Then apply phase-level risk multipliers:
- Phase has 0 unknowns and uses familiar tech → 1.0× (rare).
- Phase has 1–2 new libraries or patterns → 1.3×.
- Phase has external dependencies (third-party APIs, vendor integrations) → 1.5×.
- Phase requires learning a new domain or architecture → 2.0×.

## The most common estimation error

Estimating the happy path and forgetting: error handling, testing, code review, deployment, and rollback. These reliably add 40–60% to implementation time. Build them in.

## When the user wants a deadline

Don't give a date without a task list. A date without tasks is a guess with false precision. Say: "Let me count the tasks first." Then: "Given N tasks at an average of Y hours each, plus Z% risk buffer, earliest realistic is [date]."

## Smell tests

- Phase estimate is under 2 hours → you forgot something or the phase is too small to be a phase.
- Phase estimate is over 4 weeks for a solo developer → too much for one phase. Split the scope.
- Your estimate didn't change after you identified a risk → you didn't account for the risk. Revisit.
