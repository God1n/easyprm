# easyprm v0.2 — Playbooks, Phases, ADRs, Briefing

**Status:** Design approved (pending spec review)
**Date:** 2026-06-06
**Author:** pasindu@terminusapp.ai
**Builds on:** [v0.1 design](2026-06-05-easyprm-mcp-design.md). Everything in v0.1 stays; this doc only describes additions and changes.

## Goal

Turn easyprm from a structured ticket store into a **portable PM knowledge base + project model**. Claude consults the tool not only for *what* to do (tickets) but *how* to do project management — the right order to draft docs, how to break a project into epics, what makes a real Definition of Done. The same logic works in any MCP client and updates centrally via `npm publish`.

## Guiding insight

v0.1's central rule was authored/derived. v0.2 adds a second rule:

> **Knowledge ships with the tool.** PM theory and best practices live inside the npm package as bundled, queryable playbooks — not in user prompts, not in client-specific skills, not in tribal knowledge. Bump the version, everyone gets better practice.

The MCP server stays LLM-free and deterministic. Playbooks are static content returned by tools.

## Scope

Four additions, one polish. All backward-compatible with v0.1 trees (epics with no `phase`, no `decisions/`, no `phases/` keep working unchanged).

1. **Playbooks** — bundled PM knowledge base, queryable via tools.
2. **Phases** — optional metadata grouping above epics, with overview filtering.
3. **ADRs** — lightweight decision log (closes v0.1's deferred Tier-1 item).
4. **`get_briefing`** — single tool returning rich session-start context.
5. **Polish:** `write_doc` updates `project.md`'s index; existing `next_steps` hints reference playbooks.

## File Structure (additions in **bold**)

```
.claude/easyprm/
├── project.md                  # adds `active_phase` field
├── docs/                       # unchanged (big-picture.md, sfr.md, trf.md, …)
├── **phases.md**               # DERIVED — phases summary
├── **phases/**                 # AUTHORED — per-phase docs
│   ├── P1-<slug>.md
│   └── P2-<slug>.md
├── **decisions/**              # AUTHORED — ADRs (0001-<slug>.md, …)
├── epics/
│   └── E1-<slug>/              # epic.md gains optional `phase: P#` frontmatter field
│       ├── epic.md
│       └── tasks/E1-T1-<slug>.md   # tasks unchanged
└── overview/                   # DERIVED — kanban/dependencies/architecture/status
                                # all gain phase-awareness; default = active_phase
```

The npm package itself gains:

```
src/playbooks/                  # AUTHORED — bundled into dist/playbooks/
├── project-setup.md
├── big-picture-writing.md
├── requirements-writing.md
├── tech-doc-writing.md
├── epic-decomposition.md
├── task-decomposition.md
├── user-story-writing.md
├── definition-of-done.md
├── definition-of-ready.md
├── dependency-mapping.md
├── estimating.md
├── adr-writing.md
└── risk-identification.md
```

## Playbooks

### Shape

Each playbook is one markdown file, frontmatter + body:

```markdown
---
name: epic-decomposition
title: Breaking a project into epics
when_to_use: Right after big-picture and sfr are drafted, before creating any epic.
related: [task-decomposition, user-story-writing]
---

# Breaking a project into epics

## The rule of thumb
An epic is a slice of value a user could in principle experience. …

## Three approaches
1. **User-journey slicing** — …
2. **MVP slicing** — …
3. **Technical-stack slicing** — usually wrong for product work because …

## Smell tests
- If an epic has zero user-visible outcome → likely a task pretending to be an epic.
- If an epic has 30+ tasks → probably two epics in a trenchcoat.
…
```

200–400 words per playbook. Opinionated. Concrete. Targets solo devs working with AI.

### Tools

- `list_playbooks()` → `{ playbooks: [{ name, title, when_to_use, related }] }`. One call returns the entire catalog so Claude can decide which to fetch.
- `get_playbook(name)` → `{ name, title, content }` (full markdown).

### Discovery loop

`next_steps` hints reference playbooks at the right moment:

- After `init_project`: *"Read `get_playbook('project-setup')` for the recommended doc order."*
- After `write_doc('big-picture.md')`: *"Read `get_playbook('requirements-writing')` before drafting sfr.md."*
- After `create_epic`: *"Read `get_playbook('task-decomposition')` before breaking it down."*
- After `update_task(..., status: 'in_review')`: *"Consider an ADR if you made a non-obvious decision — `get_playbook('adr-writing')`."*

Tool descriptions also reference the catalog so Claude knows the knowledge base exists from the first tool registration message.

## Phases (metadata-based)

### Data model

- **`phases/P<n>-<slug>.md`** — one file per phase, AUTHORED. Frontmatter:
  ```yaml
  id: P1
  title: MVP
  status: planning      # planning | active | shipped
  goal: First release users can sign in and create one resource.
  created: 2026-06-06
  updated: 2026-06-06
  ```
  Body: Description + Success Criteria sections.

- **`project.md`** gains an `active_phase: P1` line in its body (parsed by the store).

- **Epic frontmatter** gains optional `phase: P1`. Epics without `phase` belong to an implicit "unscoped" bucket — preserves v0.1 compatibility.

- **`phases.md`** — DERIVED summary, regenerated on every mutation: lists all phases with status, goal, and per-phase progress (`<done>/<total>` tasks, %).

### Semantics

Phases are **sequential releases** (MVP → v2 → v3, or Iteration 1 → Iteration 2, etc.). Only one phase is `active` at a time. Other phases can be `planning` (not started) or `shipped` (done). Cross-phase dependencies are allowed — the DAG just sees IDs.

### New tools

- `create_phase({ title, goal, description, successCriteria? })` → assigns next `P#` id.
- `list_phases()` — sorted by id.
- `update_phase(id, { status?, goal?, title?, description?, successCriteria? })`.
- `set_active_phase(id)` — writes `active_phase: P#` into `project.md`. Transitions the target phase's `status` from `planning` to `active` (and the previous active phase from `active` to `planning`, unless it was already `shipped`). Refuses if the target phase is `shipped` — use `update_phase` to reopen it first.

### Changes to existing tools

- `create_epic` gains optional `phase: P#`. Defaults to current `active_phase`.
- `list_epics`, `list_tasks`, `get_next_task` gain optional `phase` filter. Default = `active_phase` (so `get_next_task` doesn't recommend P2 tasks while you're shipping P1).
- `get_status` reports active phase, current-phase progress, and recommended next task scoped to active phase.

### Overview impact

- **`kanban.md`** — primary board scoped to active phase; collapsed "Other phases" section at the bottom shows summary counts only. Epics without a `phase` (legacy v0.1 trees or deliberately unscoped work) appear under an "Unscoped" group.
- **`dependencies.md`** — full DAG (all phases). Nodes grouped/colored by phase to visualize phase boundaries. A `<!-- phase: P1 -->` Mermaid subgraph clusters per-phase nodes.
- **`architecture.md`** — unchanged (architecture spans phases).
- **`status.md`** — includes active-phase block prominently; recommended next stays scoped to active phase but notes if a P2 task is unblocked ("Next phase is ready when you are").

## ADRs

### Data model

`decisions/0001-<slug>.md`, `decisions/0002-<slug>.md`, … sequential ID with leading zeros (4 digits, room for 9999 decisions). Frontmatter:

```yaml
id: "0003"
title: Use SQLite for v1 instead of Postgres
status: accepted        # proposed | accepted | superseded
epic: E2                # optional link
supersedes: "0001"      # optional, for status: superseded
date: 2026-06-06
```

Body has three required sections: **Context**, **Decision**, **Consequences**.

### Tools

- `add_decision({ title, status?, epic?, supersedes?, context, decision, consequences })` → assigns next `####` id.
- `list_decisions({ epic?, status? })`.
- `update_decision(id, …)` — mainly for marking `accepted` or `superseded`.

### Integration

- `get_status` and `get_briefing` reference the latest 3 ADRs.
- Renderer for a per-epic ADR list inside `status.md`.
- `update_task` with significant Technical Summary content nudges *"Consider an ADR — `get_playbook('adr-writing')`."*

## `get_briefing`

Single read tool, no schema changes elsewhere. Returns one JSON blob with everything a fresh Claude session needs:

```json
{
  "project": { "name": "Demo", "active_phase": "P1" },
  "active_phase": {
    "id": "P1",
    "title": "MVP",
    "goal": "...",
    "progress": { "done": 5, "total": 12, "pct": 41 }
  },
  "in_progress": [
    { "id": "E1-T2", "title": "...", "what_to_do_remaining": ["..."] }
  ],
  "blocked": [{ "id": "E1-T4", "title": "...", "reason": "..." }],
  "next_recommended": { "id": "E1-T3", "title": "...", "reason": "..." },
  "recent_decisions": [
    { "id": "0003", "title": "...", "date": "..." }
  ],
  "recent_comments": [
    { "task": "E1-T2", "date": "...", "author": "AI", "text": "..." }
  ]
}
```

`next_steps`: *"You have what you need to resume work. Use `get_playbook` if you need PM guidance."*

## Error handling

Three new codes added to the existing `ErrorCode` union:

- `PHASE_NOT_FOUND` — referenced phase id doesn't exist.
- `PLAYBOOK_NOT_FOUND` — referenced playbook name doesn't exist.
- `DECISION_NOT_FOUND` — referenced ADR id doesn't exist.

`set_active_phase` rejecting a `shipped` phase uses `VALIDATION_ERROR` with `field: "id"` and `next_steps` directing to `update_phase` to reopen.

## Tool surface summary

v0.1 had 15 tools. v0.2 adds 10, modifies 6, removes 0 → **25 tools total**.

**New (10):** `list_playbooks`, `get_playbook`, `create_phase`, `list_phases`, `update_phase`, `set_active_phase`, `add_decision`, `list_decisions`, `update_decision`, `get_briefing`.

**Modified (6):** `init_project` (next_steps references playbook), `create_epic` (accepts `phase`), `list_epics` / `list_tasks` / `get_next_task` (accept `phase` filter, default = active phase), `get_status` (phase-aware).

## Testing strategy

Same TDD pattern as v0.1.

**Unit tests:**
- Playbook catalog loading from `dist/playbooks/` (with a bundle-path resolver that works under both `tsx` dev runs and the published `dist/`).
- Phase metadata parse/serialize.
- Active-phase filter logic in `getNextTask` and list queries.
- ADR id sequencing, frontmatter validation.

**Integration tests** extend the existing end-to-end loop:
- Bootstrap project → create P1 → create P2 → epics with phase assignments → confirm `get_next_task` returns only active-phase candidates → `set_active_phase(P2)` → confirm focus shifts → `get_briefing` returns coherent snapshot.
- `get_playbook('epic-decomposition')` returns expected content.

## Scope boundaries

**In v0.2 (this design):** everything above.

**Deferred to v0.3 (Tier 2 — plan↔code bridge):** `link_commit`, `link_pr`, `commit_message`, optional post-commit hook. The "plan ↔ code that survives sessions" half of the original mission.

**Deferred to v0.4 (Tier 4 — AI-native):** the companion skill `easyprm-pm` that gives Claude an operating system (always call `get_briefing` first, always check active phase, always nudge ADRs, etc.). Built outside the MCP, layered on top.

**Stretch:** drift detection (compare declared architecture/components vs. real codebase). Wait until felt-need is clear.
