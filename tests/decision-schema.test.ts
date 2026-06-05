import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { nextDecisionId } from "../src/ids.js";
import { validateDecisionFrontmatter } from "../src/schema.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-dec-"));
  process.env.EASYPRM_ROOT = root;
  mkdirSync(path.join(root, ".claude/easyprm/decisions"), { recursive: true });
});
afterEach(() => { delete process.env.EASYPRM_ROOT; rmSync(root, { recursive: true, force: true }); });

describe("nextDecisionId", () => {
  it("returns 0001 when no decisions exist", async () => {
    expect(await nextDecisionId()).toBe("0001");
  });
  it("returns next zero-padded id after existing decisions", async () => {
    const dir = path.join(root, ".claude/easyprm/decisions");
    writeFileSync(path.join(dir, "0001-x.md"), "");
    writeFileSync(path.join(dir, "0003-y.md"), "");
    expect(await nextDecisionId()).toBe("0004");
  });
});

describe("validateDecisionFrontmatter", () => {
  it("accepts a valid record", () => {
    const fm = validateDecisionFrontmatter({
      id: "0001", title: "Use SQLite", status: "accepted", date: "2026-06-06",
    });
    expect(fm.id).toBe("0001");
    expect(fm.status).toBe("accepted");
  });
  it("rejects invalid status with VALIDATION_ERROR", () => {
    expect(() => validateDecisionFrontmatter({
      id: "0001", title: "x", status: "nope", date: "2026-06-06",
    })).toThrowError(/VALIDATION_ERROR|status/);
  });
});
