import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listPlaybooks, getPlaybook } from "../src/playbookStore.js";
import { EasyprmError } from "../src/errors.js";

// Seed a fixture directory under src/playbooks for testing
const PB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "playbooks");
const SEEDED = ["__fixture-a.md", "__fixture-b.md"];

beforeAll(() => {
  mkdirSync(PB_DIR, { recursive: true });
  writeFileSync(path.join(PB_DIR, SEEDED[0]),
    "---\nname: __fixture-a\ntitle: Fixture A\nwhen_to_use: Always.\n---\n\n# Body A\n");
  writeFileSync(path.join(PB_DIR, SEEDED[1]),
    "---\nname: __fixture-b\ntitle: Fixture B\nwhen_to_use: Never.\nrelated: [__fixture-a]\n---\n\n# Body B\n");
});

afterAll(() => {
  SEEDED.forEach((f) => rmSync(path.join(PB_DIR, f), { force: true }));
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
  });

  it("getPlaybook throws PLAYBOOK_NOT_FOUND for unknown name", async () => {
    await expect(getPlaybook("nope")).rejects.toBeInstanceOf(EasyprmError);
    await expect(getPlaybook("nope")).rejects.toMatchObject({ code: "PLAYBOOK_NOT_FOUND" });
  });
});
