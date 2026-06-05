// tests/epics.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic, listEpics, readEpic, updateEpic } from "../src/store/epics.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-epics-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("epics store", () => {
  it("creates an epic with assigned id and folder", async () => {
    const epic = await createEpic(
      { title: "Authentication", goal: "Users can sign in", description: "Auth flows" },
      "2026-06-05",
    );
    expect(epic.frontmatter.id).toBe("E1");
    expect(epic.slug).toBe("E1-authentication");
    expect(epic.frontmatter.status).toBe("backlog");
  });

  it("lists epics", async () => {
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
    await createEpic({ title: "Billing", goal: "g", description: "d" }, "2026-06-05");
    const epics = await listEpics();
    expect(epics.map((e) => e.frontmatter.id).sort()).toEqual(["E1", "E2"]);
  });

  it("updates epic status and bumps updated date", async () => {
    const epic = await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
    const updated = await updateEpic(epic.slug, { status: "in_progress" }, "2026-06-06");
    expect(updated.frontmatter.status).toBe("in_progress");
    expect(updated.frontmatter.updated).toBe("2026-06-06");
    const reread = await readEpic(epic.slug);
    expect(reread.frontmatter.status).toBe("in_progress");
  });

  it("throws NOT_FOUND for an unknown epic", async () => {
    await expect(readEpic("E9-ghost")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
