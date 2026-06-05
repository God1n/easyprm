// tests/paths.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { paths } from "../src/paths.js";

describe("paths", () => {
  afterEach(() => { delete process.env.EASYPRM_ROOT; });

  it("roots everything under .claude/easyprm of EASYPRM_ROOT", () => {
    process.env.EASYPRM_ROOT = "/tmp/proj";
    const p = paths();
    expect(p.base).toBe("/tmp/proj/.claude/easyprm");
    expect(p.docs).toBe("/tmp/proj/.claude/easyprm/docs");
    expect(p.epics).toBe("/tmp/proj/.claude/easyprm/epics");
    expect(p.overview).toBe("/tmp/proj/.claude/easyprm/overview");
    expect(p.projectFile).toBe("/tmp/proj/.claude/easyprm/project.md");
  });

  it("returns per-epic and per-task paths", () => {
    process.env.EASYPRM_ROOT = "/tmp/proj";
    const p = paths();
    expect(p.epicDir("E1-auth")).toBe("/tmp/proj/.claude/easyprm/epics/E1-auth");
    expect(p.epicFile("E1-auth")).toBe("/tmp/proj/.claude/easyprm/epics/E1-auth/epic.md");
    expect(p.taskFile("E1-auth", "E1-T1-login")).toBe(
      "/tmp/proj/.claude/easyprm/epics/E1-auth/tasks/E1-T1-login.md"
    );
  });
});
