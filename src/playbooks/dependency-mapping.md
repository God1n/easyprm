---
name: dependency-mapping
title: Mapping task dependencies
when_to_use: When deciding whether to set depends_on on a new or existing task.
related: [task-decomposition]
---

# Mapping task dependencies

A dependency is a blocking relationship: task B cannot be meaningfully started until task A is done. If B can be partially done without A, it's not a hard dependency — model it differently.

## When to set depends_on

Set `depends_on` when:
- Task B requires an artifact from task A (a schema, an API, a deployed service).
- Starting task B without task A's output would require significant rework.
- The tasks are in the same epic and must execute in sequence for correctness.

Do NOT set `depends_on` when:
- Task B would be "nicer" to do after A but can proceed without it.
- The dependency is across epics where the earlier epic is already done.
- You're using dependencies to sequence work that could actually run in parallel.

## Spotting artificial dependencies

Artificial dependencies are the most common planning mistake. They happen when you model execution order as a blocking relationship. Ask: "if task A were already done, would B need to change at all?" If no, there's no real dependency — remove it.

## The dependency graph

After declaring all dependencies, easyprm generates a dependency graph in the overview. Look for:
- **Long chains** (A → B → C → D → E): identifies critical path. Any delay cascades. Add slack or split tasks.
- **Bottlenecks** (many tasks all pointing to one task): that one task is high-risk. Prioritize it early.
- **Isolated tasks**: no dependencies in or out. These can start anytime — good candidates to parallelize.

## Cycles

easyprm will reject circular dependencies (A → B → A). If you hit this rejection, one of the dependencies is artificial. Remove the weakest one and redesign the split so tasks are genuinely independent.

## Cross-epic dependencies

Prefer not to set cross-epic `depends_on`. Instead, sequence epics so that the blocking epic is completed before the dependent epic begins. Cross-epic task dependencies make the DAG harder to read and often indicate a poor epic boundary.
