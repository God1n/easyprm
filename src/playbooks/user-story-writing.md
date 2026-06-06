---
name: user-story-writing
title: Writing user stories for tasks
when_to_use: When writing the User Story section on any task.
related: [definition-of-done]
---

# Writing user stories for tasks

A user story is a constraint on the task, not a description of it. It forces you to answer "who benefits and why" before you write a single line of code.

## The format

"As a [specific user], I want to [do something specific] so that [concrete benefit]."

Every clause must be concrete:
- "a user" → too vague. Say "a registered user who hasn't verified their email" or "a team admin."
- "do something" → must be an action, not a state. "reset my password" not "have access to my account."
- "concrete benefit" → must be something the user cares about, not a technical outcome. "so I don't lose access if I forget my password" not "so authentication works."

## One story per task

If a task needs two user stories to make sense, it's probably two tasks. The story should match the task title almost word-for-word.

## When there's no user

Infrastructure tasks (migrations, CI setup, performance improvements) still need a beneficiary. "As a developer on this project, I want CI to run on every PR so I catch regressions before merge." The user is you.

## Smell tests

- Story ends with "so that the system works" → rewrite. System working is not a user benefit.
- Story has two "want to" clauses joined with "and" → split the task.
- You skipped writing the story because the task "feels obvious" → write it anyway. The discipline of articulating it catches scope creep before code is written.

## Example

Task: "Implement password reset flow"
Bad story: "As a user, I want to reset my password."
Good story: "As a registered user who has forgotten their password, I want to receive a reset link by email so that I can regain access to my account without contacting support."
