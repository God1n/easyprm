import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { listPlaybooks, getPlaybook } from "../src/playbookStore.js";
import { EasyprmError } from "../src/errors.js";

// Use a temp dir via env override to avoid writing fixtures into src/playbooks/
let PB_DIR: string;

beforeAll(() => {
  PB_DIR = mkdtempSync(path.join(tmpdir(), "easyprm-pb-"));
  process.env.EASYPRM_BUNDLE_PLAYBOOKS = PB_DIR;
  writeFileSync(path.join(PB_DIR, "__fixture-a.md"),
    "---\nname: __fixture-a\ntitle: Fixture A\nwhen_to_use: Always.\n---\n\n# Body A\n");
  writeFileSync(path.join(PB_DIR, "__fixture-b.md"),
    "---\nname: __fixture-b\ntitle: Fixture B\nwhen_to_use: Never.\nrelated: [__fixture-a]\n---\n\n# Body B\n");
});

afterAll(() => {
  delete process.env.EASYPRM_BUNDLE_PLAYBOOKS;
  rmSync(PB_DIR, { recursive: true, force: true });
});

describe("playbookStore", () => {
  it("listPlaybooks returns catalog metadata", async () => {
    const playbooks = await listPlaybooks();
    const names = playbooks.map((p) => p.name);
    expect(names).toContain("__fixture-a");
    expect(names).toContain("__fixture-b");
    const a = playbooks.find((p) => p.name === "__fixture-a")!;
    expect(a.title).toBe("Fixture A");
    expect(a.when_to_use).toBe("Always.");
    const b = playbooks.find((p) => p.name === "__fixture-b")!;
    expect(b.related).toEqual(["__fixture-a"]);
  });

  it("getPlaybook returns full content", async () => {
    const pb = await getPlaybook("__fixture-a");
    expect(pb.name).toBe("__fixture-a");
    expect(pb.title).toBe("Fixture A");
    expect(pb.content).toContain("# Body A");
    expect(pb.content).not.toContain("---"); // YAML delimiters stripped
    expect(pb.content).not.toMatch(/^name:/m); // structured fields not in body
  });

  it("getPlaybook throws PLAYBOOK_NOT_FOUND for unknown name", async () => {
    await expect(getPlaybook("nope")).rejects.toBeInstanceOf(EasyprmError);
    await expect(getPlaybook("nope")).rejects.toMatchObject({ code: "PLAYBOOK_NOT_FOUND" });
  });
});
