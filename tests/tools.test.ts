// tests/tools.test.ts
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

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[]).find((c) => c.type === "text")!.text;
  return JSON.parse(text);
}

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tools-"));
  process.env.EASYPRM_ROOT = root;

  const server = new McpServer({ name: "easyprm", version: "0.1.0" });
  registerTools(server);
  client = new Client({ name: "test", version: "0.0.0" });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientT), server.connect(serverT)]);
});
afterEach(async () => {
  await client.close();
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("MCP tools", () => {
  it("init_project then create_epic + create_task flow returns ok envelopes with next_steps", async () => {
    const init = await call("init_project", { name: "Demo" });
    expect(init.ok).toBe(true);
    expect(init.next_steps).toBeTruthy();

    const epic = await call("create_epic", { title: "Auth", goal: "sign in", description: "flows" });
    expect(epic.ok).toBe(true);
    expect(epic.data.id).toBe("E1");

    const task = await call("create_task", { epic: "E1", title: "Login", whatToDo: "- [ ] form" });
    expect(task.ok).toBe(true);
    expect(task.data.id).toBe("E1-T1");
  });

  it("operating before init returns NOT_INITIALIZED", async () => {
    const res = await call("create_epic", { title: "x", goal: "g", description: "d" });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("NOT_INITIALIZED");
  });

  it("get_next_task returns a recommendation after setup", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    await call("create_task", { epic: "E1", title: "Login" });
    await call("update_task", { id: "E1-T1", status: "todo" });
    const res = await call("get_next_task", {});
    expect(res.ok).toBe(true);
    expect(res.data.task.id).toBe("E1-T1");
  });

  it("update_task → done is blocked when How To Test is unmet", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    await call("create_task", { epic: "E1", title: "Login", howToTest: "- [ ] unit" });
    const res = await call("update_task", { id: "E1-T1", status: "done" });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("DOD_NOT_MET");
  });
});
