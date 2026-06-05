import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createDecision, listDecisions, updateDecision, readDecision } from "../src/store/decisions.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-dec-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

describe("decisions store", () => {
  it("creates a decision with assigned id", async () => {
    const d = await createDecision({
      title: "Use SQLite", status: "accepted",
      context: "ctx", decision: "dec", consequences: "cons",
    }, "2026-06-06");
    expect(d.frontmatter.id).toBe("0001");
    expect(d.frontmatter.status).toBe("accepted");
  });

  it("lists decisions sorted by id ascending", async () => {
    await createDecision({ title: "A", context: "x", decision: "x", consequences: "x" }, "2026-06-06");
    await createDecision({ title: "B", context: "x", decision: "x", consequences: "x" }, "2026-06-06");
    const list = await listDecisions();
    expect(list.map((d) => d.frontmatter.id)).toEqual(["0001", "0002"]);
  });

  it("updates a decision status to superseded", async () => {
    await createDecision({ title: "A", context: "x", decision: "x", consequences: "x" }, "2026-06-06");
    await createDecision({ title: "B", context: "x", decision: "x", consequences: "x" }, "2026-06-06");
    const u = await updateDecision("0001", { status: "superseded", supersedes: "0002" }, "2026-06-07");
    expect(u.frontmatter.status).toBe("superseded");
    expect(u.frontmatter.supersedes).toBe("0002");
  });

  it("throws DECISION_NOT_FOUND for unknown id", async () => {
    await expect(readDecision("9999")).rejects.toMatchObject({ code: "DECISION_NOT_FOUND" });
  });

  it("filters by epic", async () => {
    await createDecision({ title: "A", epic: "E1", context: "x", decision: "x", consequences: "x" }, "2026-06-06");
    await createDecision({ title: "B", epic: "E2", context: "x", decision: "x", consequences: "x" }, "2026-06-06");
    expect((await listDecisions({ epic: "E1" })).length).toBe(1);
  });
});
