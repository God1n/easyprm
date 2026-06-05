import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
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
  root = mkdtempSync(path.join(tmpdir(), "easyprm-ph-tools-"));
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

describe("phase tools", () => {
  it("create_phase + list_phases + set_active_phase end-to-end", async () => {
    await call("init_project", { name: "Demo" });
    expect((await call("create_phase", { title: "MVP", goal: "g", description: "d" })).data.id).toBe("P1");
    expect((await call("create_phase", { title: "V2", goal: "g", description: "d" })).data.id).toBe("P2");
    const list = await call("list_phases", {});
    expect(list.data.phases.map((p: { id: string }) => p.id)).toEqual(["P1", "P2"]);
    const active = await call("set_active_phase", { id: "P1" });
    expect(active.ok).toBe(true);
    expect(active.data.id).toBe("P1");
    expect(active.data.status).toBe("active");
  });

  it("update_phase changes the title", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_phase", { title: "MVP", goal: "g", description: "d" });
    const r = await call("update_phase", { id: "P1", title: "MVP-Revised" });
    expect(r.ok).toBe(true);
    const list = await call("list_phases", {});
    expect(list.data.phases[0].title).toBe("MVP-Revised");
  });

  it("set_active_phase refuses shipped phase", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_phase", { title: "MVP", goal: "g", description: "d" });
    await call("update_phase", { id: "P1", status: "shipped" });
    const r = await call("set_active_phase", { id: "P1" });
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe("VALIDATION_ERROR");
  });

  it("create_epic accepts phase param and stores it", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_phase", { title: "MVP", goal: "g", description: "d" });
    await call("create_phase", { title: "V2", goal: "g", description: "d" });
    await call("set_active_phase", { id: "P1" });
    const r = await call("create_epic", { title: "Billing", goal: "g", description: "d", phase: "P2" });
    expect(r.ok).toBe(true);
    const epics = await call("list_epics", { phase: "P2" });
    expect(epics.data.epics.map((e: { id: string }) => e.id)).toEqual([r.data.id]);
  });

  it("list_tasks accepts phase filter", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_phase", { title: "MVP", goal: "g", description: "d" });
    await call("create_phase", { title: "V2", goal: "g", description: "d" });
    await call("set_active_phase", { id: "P1" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    await call("create_epic", { title: "Billing", goal: "g", description: "d", phase: "P2" });
    await call("create_task", { epic: "E1", title: "Login" });
    await call("create_task", { epic: "E2", title: "Checkout" });
    const p1 = await call("list_tasks", { phase: "P1" });
    expect(p1.data.tasks.map((t: { id: string }) => t.id)).toEqual(["E1-T1"]);
    const p2 = await call("list_tasks", { phase: "P2" });
    expect(p2.data.tasks.map((t: { id: string }) => t.id)).toEqual(["E2-T1"]);
  });

  it("get_next_task with phase filter scopes recommendation", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_phase", { title: "MVP", goal: "g", description: "d" });
    await call("create_phase", { title: "V2", goal: "g", description: "d" });
    await call("set_active_phase", { id: "P1" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    await call("create_epic", { title: "Billing", goal: "g", description: "d", phase: "P2" });
    await call("create_task", { epic: "E1", title: "Login" });
    await call("create_task", { epic: "E2", title: "Checkout" });
    await call("update_task", { id: "E1-T1", status: "todo" });
    await call("update_task", { id: "E2-T1", status: "todo" });
    const p2 = await call("get_next_task", { phase: "P2" });
    expect(p2.ok).toBe(true);
    expect(p2.data.task.id).toBe("E2-T1");
  });
});
