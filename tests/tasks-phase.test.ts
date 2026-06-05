import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createPhase, setActivePhase } from "../src/store/phases.js";
import { createEpic, updateEpic } from "../src/store/epics.js";
import { createTask } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tp-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

describe("task phase inheritance", () => {
  it("task inherits its epic's phase on creation", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");
    const t = await createTask({ epic: "E1", title: "Login" }, "2026-06-06");
    expect(t.frontmatter.phase).toBe("P1");
  });

  it("task has no phase when its epic has no phase", async () => {
    // no phase created, no active_phase
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");
    const t = await createTask({ epic: "E1", title: "Login" }, "2026-06-06");
    expect(t.frontmatter.phase).toBeUndefined();
  });
});
