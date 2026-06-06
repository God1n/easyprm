---
name: risk-identification
title: Identifying and managing project risks
when_to_use: During phase planning, and when a task feels unexpectedly hard.
related: [adr-writing, estimating]
---

# Identifying and managing project risks

A risk is an uncertainty with a cost if it materializes. Naming risks doesn't doom a project — ignoring them does.

## The risk register (lightweight)

For each phase or epic, list risks in this format:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Third-party API changes breaking integration | Medium | High | Pin API version; write adapter layer |
| Underestimated auth complexity | High | Medium | Spike auth in first task of the epic |
| Performance bottleneck in search queries | Low | High | Benchmark early; document query plan |

Keep it to 3–7 risks. If you have more than 7, you're listing concerns, not risks. Prune to the ones that would actually change your plan.

## The three categories

1. **Technical risks** — unknowns in implementation (new library, complex algorithm, external API). Mitigate with spikes (small timebox experiments).
2. **Scope risks** — requirements that might grow ("just one more thing"). Mitigate with explicit "out of scope" lists.
3. **Dependency risks** — things outside your control (third-party services, another team, hardware). Mitigate with mocks or early integration.

## When a task feels unexpectedly hard

Stop. Ask: "Is this harder because I misestimated, or because I've discovered a hidden risk?" If it's a hidden risk:
1. Name it explicitly.
2. Assess whether it affects other tasks in the epic.
3. Decide: spike it, descope it, or adjust the estimate and communicate.

Never silently absorb a risk into overtime. Surface it.

## Smell tests

- Risk list is empty at the start of a phase → you haven't looked hard enough. Every phase has at least one risk.
- Every risk has "Low" likelihood and "Low" impact → you're listing things that don't worry you, not risks. Dig deeper.
- Mitigation column says "be careful" → not a mitigation. Name a concrete action or decision.
