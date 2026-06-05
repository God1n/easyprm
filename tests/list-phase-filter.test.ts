import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createPhase, setActivePhase } from "../src/store/phases.js";
import { createEpic, listEpics } from "../src/store/epics.js";
import { createTask, listTasks } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-lpf-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
  // create two phases and two epics, one in each phase
  await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
  await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
  await setActivePhase("P1", "2026-06-06");
  await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06"); // E1 in P1
  await createEpic({ title: "Billing", goal: "g", description: "d", phase: "P2" }, "2026-06-06"); // E2 in P2
  await createTask({ epic: "E1", title: "Login" }, "2026-06-06");    // E1-T1 in P1
  await createTask({ epic: "E2", title: "Checkout" }, "2026-06-06"); // E2-T1 in P2
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

describe("phase filter", () => {
  it("listEpics filters by phase", async () => {
    const p1 = await listEpics({ phase: "P1" });
    expect(p1.map((e) => e.frontmatter.id)).toEqual(["E1"]);
    const p2 = await listEpics({ phase: "P2" });
    expect(p2.map((e) => e.frontmatter.id)).toEqual(["E2"]);
  });

  it("listEpics with no filter returns all", async () => {
    const all = await listEpics();
    expect(all.map((e) => e.frontmatter.id).sort()).toEqual(["E1", "E2"]);
  });

  it("listTasks filters by phase via the parent epic", async () => {
    const p1 = await listTasks({ phase: "P1" });
    expect(p1.map((t) => t.frontmatter.id)).toEqual(["E1-T1"]);
    const p2 = await listTasks({ phase: "P2" });
    expect(p2.map((t) => t.frontmatter.id)).toEqual(["E2-T1"]);
  });

  it("listTasks honors phase filter even if a task's own phase frontmatter is stale", async () => {
    // simulate: someone changes the epic's phase after task creation
    const { updateEpic } = await import("../src/store/epics.js");
    await updateEpic("E1", { phase: "P2" }, "2026-06-07");
    // task E1-T1 still has phase: P1 in its OWN frontmatter (created when epic was P1)
    // listTasks({ phase: "P2" }) should NOW include E1-T1 (effective phase = epic's current phase)
    const p2 = await listTasks({ phase: "P2" });
    expect(p2.map((t) => t.frontmatter.id).sort()).toEqual(["E1-T1", "E2-T1"]);
  });
});
