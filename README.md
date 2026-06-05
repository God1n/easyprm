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

## Develop

```bash
npm install
npm test
npm run build
```
