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
  root = mkdtempSync(path.join(tmpdir(), "easyprm-ns-"));
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

describe("next_steps playbook references", () => {
  it("init_project hint references project-setup playbook", async () => {
    const r = await call("init_project", { name: "Demo" });
    expect(r.next_steps).toMatch(/get_playbook.*project-setup/);
  });

  it("create_epic hint references task-decomposition playbook", async () => {
    await call("init_project", { name: "Demo" });
    const r = await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    expect(r.next_steps).toMatch(/get_playbook.*task-decomposition/);
  });

  it("create_task hint references user-story-writing playbook", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    const r = await call("create_task", { epic: "E1", title: "Login" });
    expect(r.next_steps).toMatch(/get_playbook.*user-story-writing/);
  });

  it("write_doc on big-picture.md hint references requirements-writing", async () => {
    await call("init_project", { name: "Demo" });
    const r = await call("write_doc", { name: "big-picture.md", content: "# v\n" });
    expect(r.next_steps).toMatch(/get_playbook.*requirements-writing/);
  });

  it("update_task to in_review hint references adr-writing", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    await call("create_task", { epic: "E1", title: "Login" });
    const r = await call("update_task", { id: "E1-T1", status: "in_review" });
    expect(r.next_steps).toMatch(/get_playbook.*adr-writing/);
  });

  it("get_status hint mentions list_playbooks", async () => {
    await call("init_project", { name: "Demo" });
    const r = await call("get_status", {});
    expect(r.next_steps).toMatch(/list_playbooks/);
  });
});
