import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createPhase, readPhase, listPhases, updatePhase, setActivePhase } from "../src/store/phases.js";
import { getActivePhase } from "../src/store/project.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-ph-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

describe("phases store", () => {
  it("createPhase assigns P1, P2, … with planning status", async () => {
    const p1 = await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    expect(p1.frontmatter.id).toBe("P1");
    expect(p1.frontmatter.status).toBe("planning");
    const p2 = await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
    expect(p2.frontmatter.id).toBe("P2");
  });

  it("listPhases sorted by id", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
    const list = await listPhases();
    expect(list.map((p) => p.frontmatter.id)).toEqual(["P1", "P2"]);
  });

  it("setActivePhase flips status of target to active, previous active to planning", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await createPhase({ title: "V2", goal: "g", description: "d" }, "2026-06-06");
    await setActivePhase("P1", "2026-06-06");
    expect(await getActivePhase()).toBe("P1");
    expect((await readPhase("P1")).frontmatter.status).toBe("active");
    await setActivePhase("P2", "2026-06-07");
    expect(await getActivePhase()).toBe("P2");
    expect((await readPhase("P1")).frontmatter.status).toBe("planning");
    expect((await readPhase("P2")).frontmatter.status).toBe("active");
  });

  it("setActivePhase refuses shipped phase with VALIDATION_ERROR", async () => {
    await createPhase({ title: "MVP", goal: "g", description: "d" }, "2026-06-06");
    await updatePhase("P1", { status: "shipped" }, "2026-06-06");
    await expect(setActivePhase("P1", "2026-06-07")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("readPhase throws PHASE_NOT_FOUND for unknown id", async () => {
    await expect(readPhase("P99")).rejects.toMatchObject({ code: "PHASE_NOT_FOUND" });
  });
});
