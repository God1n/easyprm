import { describe, it, expect } from "vitest";
import { resolveBundleDir } from "../src/bundleResolver.js";
import path from "node:path";
import fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("resolveBundleDir", () => {
  it("locates the playbooks directory bundled with the package", () => {
    const dir = resolveBundleDir("playbooks");
    expect(fs.existsSync(dir)).toBe(true);
    expect(path.basename(dir)).toBe("playbooks");
  });

  it("throws if the bundle subdir does not exist", () => {
    expect(() => resolveBundleDir("nope-not-real")).toThrow(/bundle.*not found/i);
  });

  it("respects EASYPRM_BUNDLE_<NAME> override when set", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "easyprm-bundle-"));
    process.env.EASYPRM_BUNDLE_PLAYBOOKS = tmp;
    try {
      expect(resolveBundleDir("playbooks")).toBe(tmp);
    } finally {
      delete process.env.EASYPRM_BUNDLE_PLAYBOOKS;
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
