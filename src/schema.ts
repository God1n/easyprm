import { z } from "zod";
import { STATUSES } from "./types.js";
import type { TaskFrontmatter, EpicFrontmatter } from "./types.js";
import { EasyprmError } from "./errors.js";

const statusSchema = z.enum([...STATUSES]);

export const taskFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  epic: z.string(),
  status: statusSchema,
  depends_on: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  created: z.string(),
  updated: z.string(),
});

export const epicFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  status: statusSchema,
  goal: z.string().default(""),
  created: z.string(),
  updated: z.string(),
});

function runOrThrow<T>(schema: z.ZodType<T>, input: unknown, what: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".") || "(root)";
    throw new EasyprmError("VALIDATION_ERROR", `Invalid ${what}: ${field} — ${issue.message}`, {
      field,
      details: result.error.issues,
      next_steps: `Fix the ${field} field and retry.`,
    });
  }
  return result.data;
}

export function validateTaskFrontmatter(input: unknown): TaskFrontmatter {
  return runOrThrow(taskFrontmatterSchema, input, "task frontmatter") as TaskFrontmatter;
}

export function validateEpicFrontmatter(input: unknown): EpicFrontmatter {
  return runOrThrow(epicFrontmatterSchema, input, "epic frontmatter") as EpicFrontmatter;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
