// tests/integration-v02.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../src/tools.js";

let root: string;
let client: Client;

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[]).find((c) => c.type === "text")!.text;
  return JSON.parse(text);
}

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-v02-e2e-"));
  process.env.EASYPRM_ROOT = root;
  const server = new McpServer({ name: "easyprm", version: "0.2.0" });
  registerTools(server);
  client = new Client({ name: "t", version: "0" });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(c), server.connect(s)]);
});
afterEach(async () => {
  await client.close();
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("v0.2 end-to-end", () => {
  it("playbook lookup → bootstrap → phases → epic+task in P1 → scoped get_next_task → finish → ADR → briefing → derived files", async () => {
    // 1. Catalog visible before init (no requireInit on playbook tools)
    const catalog = await call("list_playbooks", {});
    expect(catalog.ok).toBe(true);
    expect(catalog.data.playbooks.length).toBeGreaterThanOrEqual(13);

    // 2. Init project + author docs
    await call("init_project", { name: "Demo" });
    await call("write_doc", { name: "big-picture.md", content: "# v\n" });
    await call("write_doc", { name: "sfr.md", content: "# r\n" });
    await call("write_doc", { name: "trf.md", content: "# t\n\n```easyprm:components\napi\ndb\napi -> db\n```\n" });

    // 3. Create P1, set active, create epic + task in P1
    expect((await call("create_phase", { title: "MVP", goal: "g", description: "d" })).data.id).toBe("P1");
    await call("set_active_phase", { id: "P1" });
    const e1 = await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    expect(e1.data.id).toBe("E1");
    await call("create_task", { epic: "E1", title: "Login", howToTest: "- [x] unit" });

    // 4. Task is auto-scoped to P1 via epic
    const p1Tasks = await call("list_tasks", { phase: "P1" });
    expect(p1Tasks.data.tasks.map((t: { id: string }) => t.id)).toEqual(["E1-T1"]);

    // 5. Create P2 + epic + task in P2; default scoping via active phase
    await call("create_phase", { title: "V2", goal: "g", description: "d" });
    await call("create_epic", { title: "Billing", goal: "g", description: "d", phase: "P2" });
    await call("create_task", { epic: "E2", title: "Checkout", howToTest: "- [x] unit" });
    await call("update_task", { id: "E1-T1", status: "todo" });
    await call("update_task", { id: "E2-T1", status: "todo" });

    // 6. get_next_task scoped to P1 returns E1-T1
    const next = await call("get_next_task", { phase: "P1" });
    expect(next.ok).toBe(true);
    expect(next.data.task.id).toBe("E1-T1");

    // 7. Finish E1-T1, capture ADR
    await call("update_task", { id: "E1-T1", status: "in_progress" });
    await call("update_task", { id: "E1-T1", status: "done" });
    await call("add_decision", { title: "Use SQLite", context: "c", decision: "d", consequences: "x" });

    // 8. get_briefing snapshot
    const briefing = await call("get_briefing", {});
    expect(briefing.ok).toBe(true);
    expect(briefing.data.project.name).toBe("Demo");
    expect(briefing.data.project.active_phase).toBe("P1");
    expect(briefing.data.active_phase.id).toBe("P1");
    expect(briefing.data.recent_decisions[0].id).toBe("0001");

    // 9. Derived files exist with phase-aware content
    const phasesMd = readFileSync(path.join(root, ".claude/easyprm/phases.md"), "utf8");
    expect(phasesMd).toContain("P1");
    expect(phasesMd).toContain("P2");

    const kanbanMd = readFileSync(path.join(root, ".claude/easyprm/overview/kanban.md"), "utf8");
    // Primary board (active = P1) should contain E1-T1; E2-T1 lives in Other phases summary
    const primary = kanbanMd.split("## Other phases")[0];
    expect(primary).toContain("E1-T1");
    expect(primary).not.toContain("E2-T1");

    const depsMd = readFileSync(path.join(root, ".claude/easyprm/overview/dependencies.md"), "utf8");
    expect(depsMd).toMatch(/subgraph P1 \["P1:/);
    expect(depsMd).toMatch(/subgraph P2 \["P2:/);

    const statusMd = readFileSync(path.join(root, ".claude/easyprm/overview/status.md"), "utf8");
    expect(statusMd).toMatch(/Active phase.*P1/);
  });
});
