// tests/dag.test.ts
import { describe, it, expect } from "vitest";
import { detectCycle, getNextTask } from "../src/dag.js";
import type { TaskFrontmatter, Ticket } from "../src/types.js";

function task(id: string, status: TaskFrontmatter["status"], deps: string[] = []): Ticket<TaskFrontmatter> {
  return {
    frontmatter: { id, title: id, epic: id.split("-")[0], status, depends_on: deps, tags: [], created: "x", updated: "x" },
    sections: {},
    slug: id,
  };
}

describe("detectCycle", () => {
  it("returns null when acyclic", () => {
    expect(detectCycle([task("E1-T1", "todo"), task("E1-T2", "todo", ["E1-T1"])])).toBeNull();
  });
  it("returns the cycle path when cyclic", () => {
    const cycle = detectCycle([
      task("E1-T1", "todo", ["E1-T2"]),
      task("E1-T2", "todo", ["E1-T1"]),
    ]);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThan(0);
  });
});

describe("getNextTask", () => {
  it("returns an in_progress task first", () => {
    const r = getNextTask([task("E1-T1", "todo"), task("E1-T2", "in_progress")]);
    expect(r.task?.frontmatter.id).toBe("E1-T2");
    expect(r.reason).toMatch(/in progress/i);
  });

  it("returns the lowest-id unblocked todo when none in progress", () => {
    const r = getNextTask([
      task("E1-T1", "done"),
      task("E1-T2", "todo", ["E1-T1"]),
      task("E1-T3", "todo", ["E1-T2"]),
    ]);
    expect(r.task?.frontmatter.id).toBe("E1-T2");
  });

  it("skips todo tasks whose dependencies are not done", () => {
    const r = getNextTask([
      task("E1-T1", "todo", ["E1-T2"]),
      task("E1-T2", "in_review"),
    ]);
    expect(r.task).toBeNull();
    expect(r.reason).toMatch(/blocked|no actionable/i);
  });

  it("returns null with a reason when everything is done", () => {
    const r = getNextTask([task("E1-T1", "done")]);
    expect(r.task).toBeNull();
    expect(r.reason).toMatch(/done|nothing/i);
  });

  it("returns null with a reason for an empty task list", () => {
    const r = getNextTask([]);
    expect(r.task).toBeNull();
    expect(r.reason).toBeTruthy();
  });

  it("returns the numerically lowest-id task, not the lexicographic one", () => {
    const r = getNextTask([task("E1-T10", "todo"), task("E1-T2", "todo"), task("E1-T1", "todo")]);
    expect(r.task?.frontmatter.id).toBe("E1-T1");
  });

  it("treats a todo whose dependency is 'blocked' as not actionable", () => {
    const r = getNextTask([task("E1-T1", "todo", ["E1-T2"]), task("E1-T2", "blocked")]);
    expect(r.task).toBeNull();
  });

  it("does not claim work is done when only blocked tasks remain", () => {
    const r = getNextTask([task("E1-T1", "blocked")]);
    expect(r.task).toBeNull();
    expect(r.reason).not.toMatch(/done/i);
  });
});

describe("detectCycle — additional edge cases", () => {
  it("detects a cycle reachable only from a later start node", () => {
    const cycle = detectCycle([
      task("E1-T1", "todo"),
      task("E1-T2", "todo", ["E1-T3"]),
      task("E1-T3", "todo", ["E1-T2"]),
    ]);
    expect(cycle).not.toBeNull();
  });
});
