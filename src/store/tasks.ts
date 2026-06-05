import { readdir } from "node:fs/promises";
import { paths } from "../paths.js";
import { atomicWrite, exists, readFileUtf8 } from "./fsutil.js";
import { parseTicket, renderTask, parseCheckboxes } from "../frontmatter.js";
import { validateTaskFrontmatter, slugify } from "../schema.js";
import { nextTaskId } from "../ids.js";
import { readEpic, listEpics } from "./epics.js";
import { EasyprmError } from "../errors.js";
import type { TaskFrontmatter, Ticket } from "../types.js";

interface TaskLocation { epicSlug: string; fileStem: string; }

export interface CreateTaskInput {
  epic: string;
  title: string;
  userStory?: string;
  description?: string;
  whatToDo?: string;
  howToTest?: string;
  technicalSummary?: string;
  dependsOn?: string[];
  tags?: string[];
}

async function taskFilesIn(epicSlug: string): Promise<string[]> {
  try {
    return (await readdir(paths().tasksDir(epicSlug))).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

/** Find the on-disk location of a task by its id (e.g. "E1-T2"). */
export async function locateTask(taskId: string): Promise<TaskLocation | undefined> {
  const epicId = /^(E\d+)-T\d+$/.exec(taskId)?.[1];
  if (!epicId) return undefined;
  for (const epic of await listEpics()) {
    if (epic.frontmatter.id !== epicId) continue;
    for (const f of await taskFilesIn(epic.slug)) {
      if (f.startsWith(`${taskId}-`) || f === `${taskId}.md`) {
        return { epicSlug: epic.slug, fileStem: f.replace(/\.md$/, "") };
      }
    }
  }
  return undefined;
}

export async function loadAllTasks(): Promise<Ticket<TaskFrontmatter>[]> {
  const out: Ticket<TaskFrontmatter>[] = [];
  for (const epic of await listEpics()) {
    for (const f of await taskFilesIn(epic.slug)) {
      const stem = f.replace(/\.md$/, "");
      const raw = await readFileUtf8(paths().taskFile(epic.slug, stem));
      const parsed = parseTicket(raw, stem);
      out.push({ frontmatter: validateTaskFrontmatter(parsed.frontmatter), sections: parsed.sections, slug: stem });
    }
  }
  return out.sort((a, b) =>
    a.frontmatter.id.localeCompare(b.frontmatter.id, undefined, { numeric: true }),
  );
}

export async function getTask(taskId: string): Promise<Ticket<TaskFrontmatter>> {
  const loc = await locateTask(taskId);
  if (!loc) {
    throw new EasyprmError("NOT_FOUND", `Task not found: ${taskId}`, {
      next_steps: "Call list_tasks to see available tasks.",
    });
  }
  const raw = await readFileUtf8(paths().taskFile(loc.epicSlug, loc.fileStem));
  const parsed = parseTicket(raw, loc.fileStem);
  return { frontmatter: validateTaskFrontmatter(parsed.frontmatter), sections: parsed.sections, slug: loc.fileStem };
}

export interface ListFilter { epic?: string; status?: string; tag?: string; }

export async function listTasks(filter: ListFilter = {}): Promise<Ticket<TaskFrontmatter>[]> {
  let tasks = await loadAllTasks();
  if (filter.epic) tasks = tasks.filter((t) => t.frontmatter.epic === filter.epic);
  if (filter.status) tasks = tasks.filter((t) => t.frontmatter.status === filter.status);
  if (filter.tag) tasks = tasks.filter((t) => t.frontmatter.tags.includes(filter.tag!));
  return tasks;
}

export async function createTask(input: CreateTaskInput, now: string): Promise<Ticket<TaskFrontmatter>> {
  const epic = await readEpic(input.epic); // throws NOT_FOUND if missing
  const dependsOn = input.dependsOn ?? [];
  if (dependsOn.length) {
    const existing = new Set((await loadAllTasks()).map((t) => t.frontmatter.id));
    const missing = dependsOn.filter((d) => !existing.has(d));
    if (missing.length) {
      throw new EasyprmError("DEPENDENCY_INVALID", `Unknown dependencies: ${missing.join(", ")}`, {
        field: "depends_on",
        details: { missing },
        next_steps: "Create the dependency tasks first, or remove them from depends_on.",
      });
    }
  }

  const id = await nextTaskId(epic.slug);
  const fileStem = `${id}-${slugify(input.title)}`;
  const fm = validateTaskFrontmatter({
    id,
    title: input.title,
    epic: epic.frontmatter.id,
    status: "backlog",
    depends_on: dependsOn,
    tags: input.tags ?? [],
    created: now,
    updated: now,
  });
  const sections = {
    "User Story": input.userStory ?? "",
    Description: input.description ?? "",
    "What To Do": input.whatToDo ?? "",
    "What Is Done": "",
    "How To Test": input.howToTest ?? "",
    "Technical Summary": input.technicalSummary ?? "",
    Comments: "",
  };
  await atomicWrite(paths().taskFile(epic.slug, fileStem), renderTask(fm, sections));
  return { frontmatter: fm, sections, slug: fileStem };
}

// updateTask, addComment — added below (Task 10).

export interface UpdateTaskInput {
  status?: TaskFrontmatter["status"];
  title?: string;
  dependsOn?: string[];
  tags?: string[];
  sections?: Partial<Record<
    "User Story" | "Description" | "What To Do" | "What Is Done" | "How To Test" | "Technical Summary" | "Comments",
    string
  >>;
}

function unmetDodItems(howToTest: string): string[] {
  return parseCheckboxes(howToTest).filter((c) => !c.checked).map((c) => c.text);
}

export async function updateTask(taskId: string, patch: UpdateTaskInput, now: string): Promise<Ticket<TaskFrontmatter>> {
  const loc = await locateTask(taskId);
  if (!loc) {
    throw new EasyprmError("NOT_FOUND", `Task not found: ${taskId}`, {
      next_steps: "Call list_tasks to see available tasks.",
    });
  }
  const current = await getTask(taskId);
  const mergedSections = { ...current.sections, ...(patch.sections ?? {}) };

  // Definition-of-Done guard.
  if (patch.status === "done") {
    const unmet = unmetDodItems(mergedSections["How To Test"] ?? "");
    if (unmet.length) {
      throw new EasyprmError(
        "DOD_NOT_MET",
        `Cannot move ${taskId} to 'done': ${unmet.length} of ${parseCheckboxes(mergedSections["How To Test"] ?? "").length} 'How To Test' items unchecked.`,
        {
          field: "status",
          details: { unchecked: unmet },
          next_steps: "Check the remaining boxes via update_task (sections['How To Test']), or use status 'in_review'.",
        },
      );
    }
  }

  // Dependency existence check if depends_on changed.
  if (patch.dependsOn) {
    const existing = new Set((await loadAllTasks()).map((t) => t.frontmatter.id));
    const missing = patch.dependsOn.filter((d) => d !== taskId && !existing.has(d));
    if (missing.length) {
      throw new EasyprmError("DEPENDENCY_INVALID", `Unknown dependencies: ${missing.join(", ")}`, {
        field: "depends_on",
        details: { missing },
        next_steps: "Reference existing task ids only.",
      });
    }
  }

  const fm = validateTaskFrontmatter({
    ...current.frontmatter,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.dependsOn ? { depends_on: patch.dependsOn } : {}),
    ...(patch.tags ? { tags: patch.tags } : {}),
    updated: now,
  });
  await atomicWrite(paths().taskFile(loc.epicSlug, loc.fileStem), renderTask(fm, mergedSections));
  return { frontmatter: fm, sections: mergedSections, slug: loc.fileStem };
}

export async function addComment(taskId: string, author: string, text: string, now: string): Promise<Ticket<TaskFrontmatter>> {
  const current = await getTask(taskId);
  const existing = current.sections["Comments"] ?? "";
  const line = `- ${now} (${author}): ${text}`;
  const updated = existing.trim() ? `${existing.trim()}\n${line}` : line;
  return updateTask(taskId, { sections: { Comments: updated } }, now);
}
