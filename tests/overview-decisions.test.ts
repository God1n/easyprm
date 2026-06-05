import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createDecision } from "../src/store/decisions.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-stat-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

it("status.md surfaces the latest 3 ADR titles", async () => {
  for (let i = 1; i <= 4; i++) {
    await createDecision({ title: `Decision ${i}`, context: "x", decision: "x", consequences: "x" }, "2026-06-06");
  }
  const md = readFileSync(path.join(root, ".claude/easyprm/overview/status.md"), "utf8");
  expect(md).toContain("Decision 4");
  expect(md).toContain("Decision 3");
  expect(md).toContain("Decision 2");
  expect(md).not.toContain("Decision 1");
});
