// tests/project.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject, projectExists, readProject } from "../src/store/project.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-proj-"));
  process.env.EASYPRM_ROOT = root;
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

const base = () => path.join(root, ".claude/easyprm");

describe("initProject", () => {
  it("creates the full tree and seeds default docs", async () => {
    expect(projectExists()).toBe(false);
    await initProject("My App");
    expect(projectExists()).toBe(true);
    expect(existsSync(path.join(base(), "project.md"))).toBe(true);
    expect(existsSync(path.join(base(), "docs/big-picture.md"))).toBe(true);
    expect(existsSync(path.join(base(), "docs/sfr.md"))).toBe(true);
    expect(existsSync(path.join(base(), "docs/trf.md"))).toBe(true);
    expect(existsSync(path.join(base(), "epics"))).toBe(true);
    expect(existsSync(path.join(base(), "overview"))).toBe(true);
    expect(readFileSync(path.join(base(), "project.md"), "utf8")).toContain("My App");
  });

  it("readProject returns file contents containing the project name", async () => {
    await initProject("My App");
    const content = await readProject();
    expect(content).toContain("My App");
  });

  it("is idempotent — re-init does not overwrite an existing doc", async () => {
    await initProject("My App");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(base(), "docs/big-picture.md"), "EDITED");
    await initProject("My App");
    expect(readFileSync(path.join(base(), "docs/big-picture.md"), "utf8")).toBe("EDITED");
  });
});
