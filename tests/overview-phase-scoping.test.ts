// tests/overview-phase-scoping.test.ts
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
  root = mkdtempSync(path.join(tmpdir(), "easyprm-pscope-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

const kanbanPath = () => path.join(root, ".claude/easyprm/overview/kanban.md");
const statusPath = () => path.join(root, ".claude/easyprm/overview/status.md");

describe("phase scoping in overviews", () => {
  it("kanban primary view shows only active-phase tasks; other phases collapsed", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");          // E1 in P1
    await createEpic({ title: "Billing", goal: "g", description: "d", phase: "P2" }, "2026-06-06"); // E2 in P2
    await createTask({ epic: "E1", title: "Login" }, "2026-06-06");
    await createTask({ epic: "E2", title: "Checkout" }, "2026-06-06");
    const md = readFileSync(kanbanPath(), "utf8");
    // primary board contains E1-T1
    const primary = md.split("Other phases")[0];
    expect(primary).toContain("E1-T1");
    expect(primary).not.toContain("E2-T1");
    // Other phases section summarizes
    expect(md).toMatch(/Other phases[\s\S]*P2/i);
  });

  it("kanban shows all tasks when no active phase set (v0.1 behavior)", async () => {
    // no active phase set; create an epic and task without phase
    await createEpic({ title: "Legacy", goal: "g", description: "d" }, "2026-06-06"); // E1 unscoped
    await createTask({ epic: "E1", title: "Old task" }, "2026-06-06");
    const md = readFileSync(kanbanPath(), "utf8");
    // No active_phase set → behaves like v0.1: primary board shows all tasks
    expect(md).toContain("E1-T1");
    // No "Other phases" or "Unscoped" sections
    expect(md).not.toContain("Other phases");
    expect(md).not.toContain("Unscoped");
  });

  it("status.md shows active phase headline", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    const md = readFileSync(statusPath(), "utf8");
    expect(md).toMatch(/Active phase.*P1/);
  });

  it("status.md without active phase doesn't crash and omits the active-phase line gracefully", async () => {
    const { regenerateOverview } = await import("../src/overview/index.js");
    await regenerateOverview();
    const md = readFileSync(statusPath(), "utf8");
    // v0.1-style projects: no Active phase line
    expect(md).toBeDefined();
    expect(md).toMatch(/AUTO-GENERATED/);
    expect(md).not.toMatch(/Active phase/);
  });
});
