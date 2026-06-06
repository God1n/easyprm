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

describe("project.md invariants", () => {
  it("survives a project name containing YAML metacharacters", async () => {
    rmSync(root, { recursive: true, force: true });
    root = mkdtempSync(path.join(tmpdir(), "easyprm-yaml-"));
    process.env.EASYPRM_ROOT = root;
    await initProject('My: Cool & Tricky # Project');
    // must not throw on parse
    expect(await getActivePhase()).toBeNull();
  });

  it("init_project writes project.md with active_phase: null in frontmatter", async () => {
    const { readFileSync } = await import("node:fs");
    const projectMd = readFileSync(path.join(root, ".claude/easyprm/project.md"), "utf8");
    expect(projectMd).toMatch(/^---\n[\s\S]*?active_phase:\s*null\n[\s\S]*?---/);
  });
});
