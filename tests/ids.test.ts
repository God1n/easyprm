// tests/ids.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { nextEpicId, nextTaskId } from "../src/ids.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-ids-"));
  process.env.EASYPRM_ROOT = root;
  mkdirSync(path.join(root, ".claude/easyprm/epics"), { recursive: true });
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("ids", () => {
  it("returns E1 when no epics exist", async () => {
    expect(await nextEpicId()).toBe("E1");
  });

  it("returns the next epic number after existing epics", async () => {
    mkdirSync(path.join(root, ".claude/easyprm/epics/E1-auth"));
    mkdirSync(path.join(root, ".claude/easyprm/epics/E3-billing"));
    expect(await nextEpicId()).toBe("E4");
  });

  it("returns E1-T1 when an epic has no tasks", async () => {
    mkdirSync(path.join(root, ".claude/easyprm/epics/E1-auth/tasks"), { recursive: true });
    expect(await nextTaskId("E1-auth")).toBe("E1-T1");
  });

  it("returns the next task number within an epic", async () => {
    const tasks = path.join(root, ".claude/easyprm/epics/E1-auth/tasks");
    mkdirSync(tasks, { recursive: true });
    // create two task files
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(tasks, "E1-T1-a.md"), "");
    writeFileSync(path.join(tasks, "E1-T2-b.md"), "");
    expect(await nextTaskId("E1-auth")).toBe("E1-T3");
  });
});
