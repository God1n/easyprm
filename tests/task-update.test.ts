// tests/task-update.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic } from "../src/store/epics.js";
import { createTask, updateTask, addComment, getTask } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tu-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
  await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("updateTask", () => {
  it("updates status to non-done freely", async () => {
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    const u = await updateTask("E1-T1", { status: "in_progress" }, "2026-06-06");
    expect(u.frontmatter.status).toBe("in_progress");
    expect(u.frontmatter.updated).toBe("2026-06-06");
  });

  it("blocks → done when How To Test boxes are unchecked (DOD_NOT_MET)", async () => {
    await createTask(
      { epic: "E1", title: "A", howToTest: "- [ ] unit\n- [ ] manual" },
      "2026-06-05",
    );
    await expect(
      updateTask("E1-T1", { status: "done" }, "2026-06-06"),
    ).rejects.toMatchObject({ code: "DOD_NOT_MET" });
  });

  it("allows → done when all How To Test boxes are checked", async () => {
    await createTask(
      { epic: "E1", title: "A", howToTest: "- [x] unit\n- [x] manual" },
      "2026-06-05",
    );
    const u = await updateTask("E1-T1", { status: "done" }, "2026-06-06");
    expect(u.frontmatter.status).toBe("done");
  });

  it("allows → done when How To Test has no checkboxes (nothing to satisfy)", async () => {
    await createTask({ epic: "E1", title: "A", howToTest: "manual smoke test" }, "2026-06-05");
    const u = await updateTask("E1-T1", { status: "done" }, "2026-06-06");
    expect(u.frontmatter.status).toBe("done");
  });

  it("appends a timestamped comment", async () => {
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    await addComment("E1-T1", "AI", "blocked on infra", "2026-06-06");
    const t = await getTask("E1-T1");
    expect(t.sections["Comments"]).toContain("2026-06-06 (AI): blocked on infra");
  });

  it("appends a second comment without overwriting the first", async () => {
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    await addComment("E1-T1", "AI", "first comment", "2026-06-06");
    await addComment("E1-T1", "AI", "second comment", "2026-06-07");
    const t = await getTask("E1-T1");
    expect(t.sections["Comments"]).toContain("2026-06-06 (AI): first comment");
    expect(t.sections["Comments"]).toContain("2026-06-07 (AI): second comment");
  });

  it("rejects updating dependencies to a cycle is handled at DAG layer, not here", async () => {
    // depends_on validation against existence only
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    await expect(
      updateTask("E1-T1", { dependsOn: ["E1-T42"] }, "2026-06-06"),
    ).rejects.toMatchObject({ code: "DEPENDENCY_INVALID" });
  });
});
