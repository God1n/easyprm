// tests/integration.test.ts
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
  root = mkdtempSync(path.join(tmpdir(), "easyprm-e2e-"));
  process.env.EASYPRM_ROOT = root;
  const server = new McpServer({ name: "easyprm", version: "0.1.0" });
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

describe("end-to-end planning + following loop", () => {
  it("plans an epic with two dependent tasks and follows them to done", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "sign in", description: "d" });
    await call("create_task", { epic: "E1", title: "Token store", howToTest: "- [x] unit" });
    await call("create_task", { epic: "E1", title: "Rotation", dependsOn: ["E1-T1"], howToTest: "- [x] unit" });

    // schedule both
    await call("update_task", { id: "E1-T1", status: "todo" });
    await call("update_task", { id: "E1-T2", status: "todo" });

    // next should be T1 (T2 blocked by T1)
    let next = await call("get_next_task", {});
    expect(next.data.task.id).toBe("E1-T1");

    // finish T1
    await call("update_task", { id: "E1-T1", status: "done" });

    // now next is T2
    next = await call("get_next_task", {});
    expect(next.data.task.id).toBe("E1-T2");

    await call("update_task", { id: "E1-T2", status: "done" });

    // kanban shows both done; dependencies graph has the edge
    const ov = (f: string) => path.join(root, ".claude/easyprm/overview", f);
    expect(readFileSync(ov("kanban.md"), "utf8")).toMatch(/Done \(2\)/);
    expect(readFileSync(ov("dependencies.md"), "utf8")).toContain("E1_T1 --> E1_T2");

    // everything done → no next
    next = await call("get_next_task", {});
    expect(next.data.task).toBeNull();
  });
});
