// tests/frontmatter.test.ts
import { describe, it, expect } from "vitest";
import {
  parseTicket,
  renderTask,
  parseCheckboxes,
  TASK_SECTIONS,
} from "../src/frontmatter.js";

const SAMPLE = `---
id: E1-T1
title: Login
status: todo
---

# E1-T1 · Login

## User Story
As a user I want to log in.

## How To Test
- [ ] unit passes
- [x] manual done
`;

describe("frontmatter", () => {
  it("parses frontmatter and named sections", () => {
    const t = parseTicket(SAMPLE, "E1-T1-login");
    expect(t.frontmatter.id).toBe("E1-T1");
    expect(t.frontmatter.status).toBe("todo");
    expect(t.sections["User Story"].trim()).toBe("As a user I want to log in.");
    expect(t.sections["How To Test"]).toContain("- [ ] unit passes");
    expect(t.slug).toBe("E1-T1-login");
  });

  it("parseCheckboxes extracts text and checked state", () => {
    const boxes = parseCheckboxes("- [ ] unit passes\n- [x] manual done\nnot a box");
    expect(boxes).toEqual([
      { text: "unit passes", checked: false },
      { text: "manual done", checked: true },
    ]);
  });

  it("renderTask round-trips frontmatter and known sections in fixed order", () => {
    const md = renderTask(
      {
        id: "E1-T1",
        title: "Login",
        epic: "E1",
        status: "todo",
        depends_on: [],
        tags: [],
        created: "2026-06-05",
        updated: "2026-06-05",
      },
      { "User Story": "As a user I want to log in." },
    );
    expect(md).toContain("id: E1-T1");
    expect(md).toContain("# E1-T1 · Login");
    // every canonical section heading is present
    for (const h of TASK_SECTIONS) expect(md).toContain(`## ${h}`);
    // round-trips
    const reparsed = parseTicket(md, "E1-T1-login");
    expect(reparsed.frontmatter.id).toBe("E1-T1");
    expect(reparsed.sections["User Story"].trim()).toBe(
      "As a user I want to log in.",
    );
  });

  it("throws FILE_CONFLICT on unparseable frontmatter", () => {
    expect(() => parseTicket("no frontmatter here", "x")).toThrowError(
      /FILE_CONFLICT|frontmatter/i,
    );
  });
});
