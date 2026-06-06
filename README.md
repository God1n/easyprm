# easyprm

File-based project management MCP server for solo developers building with AI. It owns a `.claude/easyprm/` doc tree, gives you rich tickets, and keeps a kanban board, dependency graph, architecture diagram, and "where was I" status auto-generated from your tickets.

## Install (Claude Code)

```bash
claude mcp add easyprm -- npx -y easyprm
```

Or configure manually in your MCP client:

```json
{
  "mcpServers": {
    "easyprm": { "command": "npx", "args": ["-y", "easyprm"] }
  }
}
```

The server manages files under the current working directory's `.claude/easyprm/`. Set `EASYPRM_ROOT` to target a different project root.

## The loop

1. `init_project` — scaffold the tree.
2. Draft `docs/big-picture.md` → `sfr.md` → `trf.md`.
3. `create_epic` → `create_task` (declare `dependsOn`).
4. `get_status` / `get_next_task` — stay on the plan.
5. `update_task` — track progress; `→ done` requires all "How To Test" boxes checked.

`overview/` files are auto-generated — never edit them by hand.

## What's new in 0.2

- **PM playbooks** bundled in the package. Call `list_playbooks` for the catalog (13 entries: project-setup, big-picture-writing, requirements-writing, tech-doc-writing, epic-decomposition, task-decomposition, user-story-writing, definition-of-done, definition-of-ready, dependency-mapping, estimating, adr-writing, risk-identification), `get_playbook(name)` for full content.
- **Phases** as optional grouping above epics — sequential releases (MVP → v2 → v3). `create_phase`, `set_active_phase`, then `create_epic` lands in the active phase by default. `list_tasks` / `get_next_task` default to the active phase.
- **ADRs** — lightweight decision log in `decisions/` via `add_decision`, `list_decisions`, `update_decision`. Latest 3 surface in `status.md`.
- **`get_briefing`** — one tool returns project + active phase + in-progress + recommended next + recent ADRs + recent comments. Call at session start.
- **Sharper next_steps hints** — every tool response now points to the relevant playbook for what to do next.

## Develop

```bash
npm install
npm test
npm run build
```
