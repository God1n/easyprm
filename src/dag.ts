import type { TaskFrontmatter, Ticket } from "./types.js";

type T = Ticket<TaskFrontmatter>;

/** Returns a cycle path (list of ids) if the depends_on graph has a cycle, else null. */
export function detectCycle(tasks: T[]): string[] | null {
  const byId = new Map(tasks.map((t) => [t.frontmatter.id, t]));
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  function visit(id: string): string[] | null {
    const s = state.get(id);
    if (s === "done") return null;
    if (s === "visiting") {
      const start = stack.indexOf(id);
      return [...stack.slice(start), id];
    }
    state.set(id, "visiting");
    stack.push(id);
    const node = byId.get(id);
    for (const dep of node?.frontmatter.depends_on ?? []) {
      if (!byId.has(dep)) continue; // unknown deps validated elsewhere
      const found = visit(dep);
      if (found) return found;
    }
    stack.pop();
    state.set(id, "done");
    return null;
  }

  for (const t of tasks) {
    const found = visit(t.frontmatter.id);
    if (found) return found;
  }
  return null;
}

export interface NextTaskResult {
  task: T | null;
  reason: string;
}

export function getNextTask(tasks: T[]): NextTaskResult {
  const byId = new Map(tasks.map((t) => [t.frontmatter.id, t]));
  const sorted = [...tasks].sort((a, b) =>
    a.frontmatter.id.localeCompare(b.frontmatter.id, undefined, { numeric: true }),
  );

  const inProgress = sorted.find((t) => t.frontmatter.status === "in_progress");
  if (inProgress) {
    return { task: inProgress, reason: `${inProgress.frontmatter.id} is already in progress — finish it first.` };
  }

  const isDone = (id: string) => byId.get(id)?.frontmatter.status === "done";
  const actionable = sorted.find(
    (t) => t.frontmatter.status === "todo" && t.frontmatter.depends_on.every(isDone),
  );
  if (actionable) {
    const deps = actionable.frontmatter.depends_on;
    const reason = deps.length
      ? `${actionable.frontmatter.id} is unblocked — its dependencies (${deps.join(", ")}) are done.`
      : `${actionable.frontmatter.id} is the next ready task with no dependencies.`;
    return { task: actionable, reason };
  }

  const anyTodo = sorted.some((t) => t.frontmatter.status === "todo");
  if (anyTodo) {
    return { task: null, reason: "No actionable task: all 'todo' tasks are blocked by unfinished dependencies." };
  }
  return { task: null, reason: "Nothing to do: no tasks are in 'todo'. Move tasks out of backlog or all work is done." };
}
