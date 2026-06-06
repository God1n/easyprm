#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerTools } from "./tools.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// package.json sits two levels up from dist/index.js (and one above src/index.ts under tsx)
function findPackageJson(): string {
  const candidates = [
    path.resolve(here, "..", "package.json"),       // dist/index.js → ../package.json
    path.resolve(here, "..", "..", "package.json"), // src/index.ts → ../../package.json (under tsx, here is src/)
  ];
  for (const c of candidates) {
    try {
      const raw = readFileSync(c, "utf8");
      const pkg = JSON.parse(raw);
      if (pkg.name === "easyprm" && typeof pkg.version === "string") return pkg.version;
    } catch { /* try next */ }
  }
  return "0.0.0-unknown";
}

const VERSION = findPackageJson();

async function main(): Promise<void> {
  const server = new McpServer({ name: "easyprm", version: VERSION });
  registerTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server now runs over stdio until the client disconnects.
}

main().catch((err) => {
  // Never write to stdout — that channel is the MCP transport. Log to stderr.
  console.error("easyprm fatal:", err);
  process.exit(1);
});
