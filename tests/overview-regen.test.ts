// tests/overview-regen.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic } from "../src/store/epics.js";
import { createTask } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-regen-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

const ov = (f: string) => path.join(root, ".claude/easyprm/overview", f);

describe("auto-regeneration", () => {
  it("writes all four overview files after a task is created", async () => {
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
    await createTask({ epic: "E1", title: "Login" }, "2026-06-05");
    for (const f of ["kanban.md", "dependencies.md", "architecture.md", "status.md"]) {
      expect(existsSync(ov(f))).toBe(true);
    }
    expect(readFileSync(ov("kanban.md"), "utf8")).toContain("E1-T1");
    expect(readFileSync(ov("status.md"), "utf8")).toContain("E1");
  });

  it("regenerates all four files on an empty project without throwing", async () => {
    const { regenerateOverview } = await import("../src/overview/index.js");
    const files = await regenerateOverview();
    expect(files.sort()).toEqual(["architecture.md", "dependencies.md", "kanban.md", "status.md"]);
    for (const f of ["kanban.md", "dependencies.md", "architecture.md", "status.md"]) {
      expect(existsSync(ov(f))).toBe(true);
    }
  });
});
