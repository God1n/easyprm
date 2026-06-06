// tests/overview-phases.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createPhase, setActivePhase, updatePhase } from "../src/store/phases.js";
import { createEpic } from "../src/store/epics.js";
import { createTask, updateTask } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-phmd-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

const phasesPath = () => path.join(root, ".claude/easyprm/phases.md");

describe("phases.md", () => {
  it("is created on init with a 'no phases yet' note", async () => {
    // initProject + any mutation should produce the file via regenerateOverview
    const { regenerateOverview } = await import("../src/overview/index.js");
    await regenerateOverview();
    const md = readFileSync(phasesPath(), "utf8");
    expect(md).toContain("AUTO-GENERATED");
    expect(md).toMatch(/no phases/i);
  });

  it("lists phases with status, goal, and per-phase progress", async () => {
    await createPhase({ title: "MVP", goal: "Sign in flow", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");
    await createTask({ epic: "E1", title: "Login", howToTest: "- [x] unit" }, "2026-06-06");
    await createTask({ epic: "E1", title: "Logout", howToTest: "- [x] unit" }, "2026-06-06");
    await createTask({ epic: "E1", title: "Reset", howToTest: "- [x] unit" }, "2026-06-06");
    await updateTask("E1-T1", { status: "done" }, "2026-06-06");
    await updateTask("E1-T2", { status: "done" }, "2026-06-06");

    await createPhase({ title: "V2", goal: "Billing", description: "d" }, "2026-06-06");

    const md = readFileSync(phasesPath(), "utf8");
    expect(md).toContain("P1");
    expect(md).toContain("MVP");
    expect(md).toContain("Sign in flow");
    expect(md).toContain("active");
    expect(md).toMatch(/2\/3/);   // 2 of 3 tasks done
    expect(md).toMatch(/67%/);
    expect(md).toContain("P2");
    expect(md).toContain("V2");
    expect(md).toContain("planning");
  });
});
