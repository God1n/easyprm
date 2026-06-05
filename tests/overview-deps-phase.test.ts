// tests/overview-deps-phase.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createPhase, setActivePhase } from "../src/store/phases.js";
import { createEpic } from "../src/store/epics.js";
import { createTask } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-dp-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

const depsPath = () => path.join(root, ".claude/easyprm/overview/dependencies.md");

describe("dependencies.md per-phase clustering", () => {
  it("groups nodes by phase using mermaid subgraphs", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06"); // E1 P1
    await createEpic({ title: "Billing", goal: "g", description: "d", phase: "P2" }, "2026-06-06"); // E2 P2
    await createTask({ epic: "E1", title: "Login" }, "2026-06-06");
    await createTask({ epic: "E2", title: "Checkout" }, "2026-06-06");
    const md = readFileSync(depsPath(), "utf8");
    expect(md).toMatch(/subgraph P1/);
    expect(md).toMatch(/subgraph P2/);
  });

  it("v0.1 trees with no phases get the existing flat output (no subgraphs)", async () => {
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");
    await createTask({ epic: "E1", title: "Login" }, "2026-06-06");
    const md = readFileSync(depsPath(), "utf8");
    expect(md).not.toContain("subgraph");
    expect(md).toContain("graph LR");
  });
});
