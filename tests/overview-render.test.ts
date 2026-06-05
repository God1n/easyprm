// tests/overview-render.test.ts
import { describe, it, expect } from "vitest";
import { renderKanban } from "../src/overview/kanban.js";
import { renderDependencies } from "../src/overview/dependencies.js";
import type { TaskFrontmatter, EpicFrontmatter, Ticket } from "../src/types.js";

function task(id: string, status: TaskFrontmatter["status"], deps: string[] = []): Ticket<TaskFrontmatter> {
  return {
    frontmatter: { id, title: `Task ${id}`, epic: id.split("-")[0], status, depends_on: deps, tags: [], created: "x", updated: "x" },
    sections: {}, slug: `${id}-x`,
  };
}
function epic(id: string): Ticket<EpicFrontmatter> {
  return { frontmatter: { id, title: `Epic ${id}`, status: "in_progress", goal: "g", created: "x", updated: "x" }, sections: {}, slug: `${id}-x` };
}

describe("renderKanban", () => {
  it("includes the auto-generated banner and a column per status with tasks", () => {
    const md = renderKanban([epic("E1")], [task("E1-T1", "todo"), task("E1-T2", "done")]);
    expect(md).toContain("AUTO-GENERATED");
    expect(md).toContain("Todo");
    expect(md).toContain("Done");
    expect(md).toContain("E1-T1");
    expect(md).toContain("E1-T2");
    // progress summary for the epic (1 of 2 done = 50%)
    expect(md).toMatch(/Epic E1.*50%/s);
  });
});

describe("renderDependencies", () => {
  it("emits a mermaid graph with nodes and dependency edges", () => {
    const md = renderDependencies([task("E1-T1", "done"), task("E1-T2", "todo", ["E1-T1"])]);
    expect(md).toContain("```mermaid");
    expect(md).toContain("graph LR");
    expect(md).toContain("E1-T1");
    expect(md).toContain("E1-T1 --> E1-T2");
  });

  it("notes when a dependency cycle is present", () => {
    const md = renderDependencies([
      task("E1-T1", "todo", ["E1-T2"]),
      task("E1-T2", "todo", ["E1-T1"]),
    ]);
    expect(md).toMatch(/cycle/i);
  });
});
