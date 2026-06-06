import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createPhase, setActivePhase } from "../src/store/phases.js";
import { createEpic, updateEpic, readEpic } from "../src/store/epics.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-ep-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

describe("createEpic + phase", () => {
  it("epic gets no phase when none set", async () => {
    const e = await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");
    expect(e.frontmatter.phase).toBeUndefined();
  });
  it("epic gets active phase by default", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    const e = await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");
    expect(e.frontmatter.phase).toBe("P1");
  });
  it("explicit phase overrides default", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    const e = await createEpic({ title: "Billing", goal: "g", description: "d", phase: "P2" }, "2026-06-06");
    expect(e.frontmatter.phase).toBe("P2");
  });
  it("updateEpic can reassign phase", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-06");
    await updateEpic("E1", { phase: "P2" }, "2026-06-07");
    expect((await readEpic("E1")).frontmatter.phase).toBe("P2");
  });
});
