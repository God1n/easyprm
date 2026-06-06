// tests/docs.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { listDocs, readDoc, writeDoc } from "../src/store/docs.js";
import { EasyprmError } from "../src/errors.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-docs-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("docs store", () => {
  it("lists seeded docs", async () => {
    const docs = await listDocs();
    expect(docs.sort()).toEqual(["big-picture.md", "sfr.md", "trf.md"]);
  });

  it("writes a new doc and reads it back", async () => {
    await writeDoc("db.md", "# Database\n");
    expect(await readDoc("db.md")).toBe("# Database\n");
    expect(await listDocs()).toContain("db.md");
  });

  it("normalizes a name without .md extension", async () => {
    await writeDoc("api", "# API\n");
    expect(await listDocs()).toContain("api.md");
  });

  it("rejects path traversal in the doc name", async () => {
    await expect(writeDoc("../escape.md", "x")).rejects.toBeInstanceOf(EasyprmError);
  });

  it("throws NOT_FOUND reading a missing doc", async () => {
    await expect(readDoc("nope.md")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("writeDoc on a NEW doc adds a link to project.md index", async () => {
    await writeDoc("db.md", "# Database\n");
    const project = readFileSync(path.join(root, ".claude/easyprm/project.md"), "utf8");
    expect(project).toContain("docs/db.md");
  });

  it("writeDoc on a seeded doc does NOT duplicate the link", async () => {
    await writeDoc("big-picture.md", "# Edited\n");
    const project = readFileSync(path.join(root, ".claude/easyprm/project.md"), "utf8");
    expect((project.match(/docs\/big-picture.md/g) ?? []).length).toBe(1);
  });

  it("writeDoc preserves project.md's active_phase frontmatter", async () => {
    // simulate: setActivePhase sets active_phase: P1
    const { setActivePhaseField } = await import("../src/store/project.js");
    await setActivePhaseField("P1");
    await writeDoc("notes.md", "# Notes\n");
    const project = readFileSync(path.join(root, ".claude/easyprm/project.md"), "utf8");
    expect(project).toMatch(/active_phase:\s*P1/);
    expect(project).toContain("docs/notes.md");
  });
});
