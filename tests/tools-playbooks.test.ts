import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../src/tools.js";

let root: string;
let client: Client;

const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "playbooks", "__t.md");

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[]).find((c) => c.type === "text")!.text;
  return JSON.parse(text);
}

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-pb-"));
  process.env.EASYPRM_ROOT = root;
  mkdirSync(path.dirname(FIXTURE), { recursive: true });
  writeFileSync(FIXTURE, "---\nname: __t\ntitle: T\nwhen_to_use: x.\n---\n\nBODY\n");
  const server = new McpServer({ name: "easyprm", version: "0.2.0" });
  registerTools(server);
  client = new Client({ name: "t", version: "0" });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(c), server.connect(s)]);
});

afterEach(async () => {
  await client.close();
  delete process.env.EASYPRM_ROOT;
  rmSync(FIXTURE, { force: true });
  rmSync(root, { recursive: true, force: true });
});

describe("playbook tools", () => {
  it("list_playbooks returns catalog without project init", async () => {
    const res = await call("list_playbooks", {});
    expect(res.ok).toBe(true);
    expect(res.data.playbooks.map((p: { name: string }) => p.name)).toContain("__t");
  });

  it("get_playbook returns full content", async () => {
    const res = await call("get_playbook", { name: "__t" });
    expect(res.ok).toBe(true);
    expect(res.data.content).toContain("BODY");
  });

  it("get_playbook surfaces PLAYBOOK_NOT_FOUND", async () => {
    const res = await call("get_playbook", { name: "nope" });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("PLAYBOOK_NOT_FOUND");
  });
});
