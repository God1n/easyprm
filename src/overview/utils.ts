import type { TaskFrontmatter, EpicFrontmatter, Ticket } from "../types.js";

/** Effective phase of a task: epic wins, task frontmatter is fallback. */
export function effectivePhaseOf(
  t: Ticket<TaskFrontmatter>,
  epicById: Map<string, Ticket<EpicFrontmatter>>,
): string | undefined {
  return epicById.get(t.frontmatter.epic)?.frontmatter.phase ?? t.frontmatter.phase;
}
