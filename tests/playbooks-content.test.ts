import { describe, it, expect } from "vitest";
import { listPlaybooks, getPlaybook } from "../src/playbookStore.js";

const EXPECTED = [
  "project-setup", "big-picture-writing", "requirements-writing", "tech-doc-writing",
  "epic-decomposition", "task-decomposition", "user-story-writing",
  "definition-of-done", "definition-of-ready", "dependency-mapping",
  "estimating", "adr-writing", "risk-identification",
];

describe("bundled playbooks", () => {
  it("all 13 playbooks are present and have non-empty when_to_use + body", async () => {
    const catalog = await listPlaybooks();
    const names = catalog.map((p) => p.name);
    for (const slug of EXPECTED) {
      expect(names).toContain(slug);
      const meta = catalog.find((p) => p.name === slug)!;
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.when_to_use.length).toBeGreaterThan(0);
      const full = await getPlaybook(slug);
      expect(full.content.length).toBeGreaterThan(800);
      expect(full.content).toMatch(/^## /m);
    }
  });
});
