import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject, getActivePhase, setActivePhaseField } from "../src/store/project.js";
import { nextPhaseId } from "../src/ids.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-ap-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

describe("active_phase plumbing", () => {
  it("is null on a fresh project", async () => {
    expect(await getActivePhase()).toBeNull();
  });
  it("setActivePhaseField writes and getActivePhase reads back", async () => {
    await setActivePhaseField("P1");
    expect(await getActivePhase()).toBe("P1");
  });
  it("setActivePhaseField(null) clears the value", async () => {
    await setActivePhaseField("P1");
    await setActivePhaseField(null);
    expect(await getActivePhase()).toBeNull();
  });
});

describe("nextPhaseId", () => {
  it("returns P1 when no phases exist", async () => {
    expect(await nextPhaseId()).toBe("P1");
  });
});
