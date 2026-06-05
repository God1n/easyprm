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
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tools-dec-"));
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

describe("ADR tools", () => {
  it("add_decision assigns 0001 and round-trips", async () => {
    await call("init_project", { name: "Demo" });
    const r = await call("add_decision", {
      title: "Use SQLite", context: "c", decision: "d", consequences: "x",
    });
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe("0001");
    const list = await call("list_decisions", {});
    expect(list.data.decisions[0].id).toBe("0001");
  });

  it("update_decision changes status", async () => {
    await call("init_project", { name: "Demo" });
    await call("add_decision", { title: "X", context: "c", decision: "d", consequences: "x" });
    const r = await call("update_decision", { id: "0001", status: "superseded" });
    expect(r.data.status).toBe("superseded");
  });

  it("list_decisions forwards epic filter to the store", async () => {
    await call("init_project", { name: "Demo" });
    await call("add_decision", { title: "A", epic: "E1", context: "c", decision: "d", consequences: "x" });
    await call("add_decision", { title: "B", epic: "E2", context: "c", decision: "d", consequences: "x" });
    const r = await call("list_decisions", { epic: "E1" });
    expect(r.ok).toBe(true);
    expect(r.data.decisions.map((d: { title: string }) => d.title)).toEqual(["A"]);
  });
});
