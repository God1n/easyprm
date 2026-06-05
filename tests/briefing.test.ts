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
  root = mkdtempSync(path.join(tmpdir(), "easyprm-bri-"));
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

it("get_briefing returns project + active phase + in_progress + next + decisions + comments", async () => {
  await call("init_project", { name: "Demo" });
  await call("create_phase", { title: "MVP", goal: "g", description: "d" });
  await call("set_active_phase", { id: "P1" });
  await call("create_epic", { title: "Auth", goal: "g", description: "d" });
  await call("create_task", { epic: "E1", title: "Login" });
  await call("update_task", { id: "E1-T1", status: "in_progress" });
  await call("add_comment", { id: "E1-T1", author: "AI", text: "looking" });
  await call("add_decision", { title: "Use SQLite", context: "c", decision: "d", consequences: "x" });

  const r = await call("get_briefing", {});
  expect(r.ok).toBe(true);
  expect(r.data.project.active_phase).toBe("P1");
  expect(r.data.active_phase.id).toBe("P1");
  expect(r.data.in_progress[0].id).toBe("E1-T1");
  expect(r.data.recent_decisions[0].id).toBe("0001");
  expect(r.data.recent_comments[0].text).toContain("looking");
});

it("get_briefing works on a project without phases", async () => {
  await call("init_project", { name: "Demo" });
  await call("create_epic", { title: "Auth", goal: "g", description: "d" });
  const r = await call("get_briefing", {});
  expect(r.ok).toBe(true);
  expect(r.data.project.active_phase).toBeNull();
  expect(r.data.active_phase).toBeNull();
});
