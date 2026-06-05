// tests/errors.test.ts
import { describe, it, expect } from "vitest";
import { EasyprmError, ok } from "../src/errors.js";

describe("errors", () => {
  it("ok() wraps data with next_steps", () => {
    expect(ok({ id: "E1" }, "do next")).toEqual({
      ok: true,
      data: { id: "E1" },
      next_steps: "do next",
    });
  });

  it("EasyprmError.toResponse() produces the unified error shape", () => {
    const err = new EasyprmError("DOD_NOT_MET", "boxes unchecked", {
      field: "status",
      details: { unchecked: ["a"] },
      recoverable: true,
      next_steps: "check boxes",
    });
    expect(err.toResponse()).toEqual({
      ok: false,
      error: {
        code: "DOD_NOT_MET",
        message: "boxes unchecked",
        field: "status",
        details: { unchecked: ["a"] },
        recoverable: true,
        next_steps: "check boxes",
      },
    });
  });

  it("defaults recoverable to true when omitted", () => {
    const err = new EasyprmError("NOT_FOUND", "missing");
    expect(err.toResponse().error.recoverable).toBe(true);
  });
});
