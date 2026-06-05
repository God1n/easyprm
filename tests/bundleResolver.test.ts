import { describe, it, expect } from "vitest";
import { resolveBundleDir } from "../src/bundleResolver.js";
import path from "node:path";
import fs from "node:fs";

describe("resolveBundleDir", () => {
  it("locates the playbooks directory bundled with the package", () => {
    const dir = resolveBundleDir("playbooks");
    expect(fs.existsSync(dir)).toBe(true);
    expect(path.basename(dir)).toBe("playbooks");
  });

  it("throws if the bundle subdir does not exist", () => {
    expect(() => resolveBundleDir("nope-not-real")).toThrow(/bundle.*not found/i);
  });
});
