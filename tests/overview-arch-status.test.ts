// tests/overview-arch-status.test.ts
import { describe, it, expect } from "vitest";
import { renderArchitecture, parseComponentsBlock } from "../src/overview/architecture.js";
import { renderStatus } from "../src/overview/status.js";
import type { TaskFrontmatter, EpicFrontmatter, Ticket } from "../src/types.js";

const TRF = `# Technical Requirements

\`\`\`easyprm:components
api
db
api -> db
\`\`\`
`;

function task(id: string, status: TaskFrontmatter["status"], deps: string[] = []): Ticket<TaskFrontmatter> {
  return { frontmatter: { id, title: `T ${id}`, epic: id.split("-")[0], status, depends_on: deps, tags: [], created: "x", updated: "x" }, sections: {}, slug: id };
}
function epic(id: string, status: EpicFrontmatter["status"]): Ticket<EpicFrontmatter> {
  return { frontmatter: { id, title: `Epic ${id}`, status, goal: "g", created: "x", updated: "x" }, sections: {}, slug: id };
}

describe("architecture", () => {
  it("parses the components block into nodes and edges", () => {
    const parsed = parseComponentsBlock(TRF);
    expect(parsed).not.toBeNull();
    expect(parsed!.nodes).toEqual(["api", "db"]);
    expect(parsed!.edges).toEqual([{ from: "api", to: "db" }]);
  });

  it("splits chained arrows into multiple edges", () => {
    const trf = "```easyprm:components\napi -> db -> cache\n```";
    const parsed = parseComponentsBlock(trf);
    expect(parsed).not.toBeNull();
    expect(parsed!.nodes.sort()).toEqual(["api", "cache", "db"]);
    expect(parsed!.edges).toEqual([
      { from: "api", to: "db" },
      { from: "db", to: "cache" },
    ]);
  });

  it("renders a mermaid graph, with a hint when the block is missing", () => {
    expect(renderArchitecture(TRF)).toContain("api --> db");
    expect(renderArchitecture("# trf with no block")).toMatch(/no .*components.* block/i);
  });
});

describe("status", () => {
  it("shows active epic, in-progress task, and next recommendation", () => {
    const md = renderStatus(
      [epic("E1", "in_progress")],
      [task("E1-T1", "done"), task("E1-T2", "in_progress"), task("E1-T3", "todo", ["E1-T2"])],
    );
    expect(md).toContain("AUTO-GENERATED");
    expect(md).toContain("E1-T2"); // in progress
    expect(md).toMatch(/Next|Recommended/i);
  });
});
