// tests/schema.test.ts
import { describe, it, expect } from "vitest";
import { validateTaskFrontmatter, slugify } from "../src/schema.js";
import { EasyprmError } from "../src/errors.js";

describe("schema", () => {
  it("accepts a valid task frontmatter", () => {
    const fm = validateTaskFrontmatter({
      id: "E1-T1",
      title: "Login",
      epic: "E1",
      status: "todo",
      depends_on: [],
      tags: [],
      created: "2026-06-05",
      updated: "2026-06-05",
    });
    expect(fm.status).toBe("todo");
  });

  it("rejects an invalid status with a VALIDATION_ERROR naming the field", () => {
    try {
      validateTaskFrontmatter({
        id: "E1-T1", title: "x", epic: "E1", status: "nope",
        depends_on: [], tags: [], created: "2026-06-05", updated: "2026-06-05",
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(EasyprmError);
      const err = e as EasyprmError;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.opts.field).toContain("status");
    }
  });

  it("slugify lowercases and dasherizes", () => {
    expect(slugify("Add JWT Refresh-Token Rotation!")).toBe("add-jwt-refresh-token-rotation");
  });
});
