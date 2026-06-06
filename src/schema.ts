import { z } from "zod";
import { STATUSES, DECISION_STATUSES, PHASE_STATUSES } from "./types.js";
import type { TaskFrontmatter, EpicFrontmatter, DecisionFrontmatter, PhaseFrontmatter } from "./types.js";
import { EasyprmError } from "./errors.js";

export const statusSchema = z.enum([...STATUSES]);

export const taskFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  epic: z.string(),
  status: statusSchema,
  depends_on: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  created: z.string(),
  updated: z.string(),
  phase: z.string().regex(/^P\d+$/).optional(),
});

export const epicFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  status: statusSchema,
  goal: z.string().default(""),
  created: z.string(),
  updated: z.string(),
  phase: z.string().regex(/^P\d+$/).optional(),
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

export const decisionStatusSchema = z.enum([...DECISION_STATUSES]);

export const decisionFrontmatterSchema = z.object({
  id: z.string().regex(/^\d{4}$/, "Decision id must be 4-digit zero-padded (e.g. 0003)."),
  title: z.string().min(1),
  status: decisionStatusSchema,
  epic: z.string().optional(),
  supersedes: z.string().regex(/^\d{4}$/).optional(),
  date: z.string(),
});

export function validateDecisionFrontmatter(input: unknown): DecisionFrontmatter {
  return runOrThrow(decisionFrontmatterSchema, input, "decision frontmatter") as DecisionFrontmatter;
}

export const phaseIdSchema = z.string().regex(/^P\d+$/);

export const phaseStatusSchema = z.enum([...PHASE_STATUSES]);

export const phaseFrontmatterSchema = z.object({
  id: z.string().regex(/^P\d+$/),
  title: z.string().min(1),
  status: phaseStatusSchema,
  goal: z.string().default(""),
  created: z.string(),
  updated: z.string(),
});

export function validatePhaseFrontmatter(input: unknown): PhaseFrontmatter {
  return runOrThrow(phaseFrontmatterSchema, input, "phase frontmatter") as PhaseFrontmatter;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
