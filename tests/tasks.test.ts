// tests/tasks.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic } from "../src/store/epics.js";
import { createTask, getTask, listTasks, loadAllTasks } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tasks-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
  await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("tasks store: create/read/list", () => {
  it("creates a task with assigned id under its epic", async () => {
    const t = await createTask(
      { epic: "E1", title: "Login form", userStory: "As a user...", whatToDo: "- [ ] build form" },
      "2026-06-05",
    );
    expect(t.frontmatter.id).toBe("E1-T1");
    expect(t.frontmatter.epic).toBe("E1");
    expect(t.frontmatter.status).toBe("backlog");
    expect(t.sections["What To Do"]).toContain("build form");
  });

  it("rejects creating a task for a missing epic", async () => {
    await expect(
      createTask({ epic: "E9", title: "x" }, "2026-06-05"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects depends_on referencing a non-existent task", async () => {
    await expect(
      createTask({ epic: "E1", title: "x", dependsOn: ["E1-T99"] }, "2026-06-05"),
    ).rejects.toMatchObject({ code: "DEPENDENCY_INVALID" });
  });

  it("gets a task by id and lists with filters", async () => {
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    await createTask({ epic: "E1", title: "B", tags: ["ui"] }, "2026-06-05");
    expect((await getTask("E1-T1")).frontmatter.title).toBe("A");
    expect((await listTasks({ epic: "E1" })).length).toBe(2);
    expect((await listTasks({ tag: "ui" })).length).toBe(1);
    expect((await loadAllTasks()).length).toBe(2);
  });
});
