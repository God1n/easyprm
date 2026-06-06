import { readdir } from "node:fs/promises";
import { paths } from "../paths.js";
import { atomicWrite, exists, ensureDir, readFileUtf8 } from "./fsutil.js";
import { parseTicket, renderEpic } from "../frontmatter.js";
import { validateEpicFrontmatter, slugify } from "../schema.js";
import { nextEpicId } from "../ids.js";
import { EasyprmError } from "../errors.js";
import { getActivePhase } from "./project.js";
import type { EpicFrontmatter, Ticket, Status } from "../types.js";

export interface CreateEpicInput {
  title: string;
  goal: string;
  description: string;
  successCriteria?: string;
  phase?: string;
}

async function epicFolders(): Promise<string[]> {
  try {
    const entries = await readdir(paths().epics, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && /^E\d+-/.test(e.name)).map((e) => e.name);
  } catch {
    return [];
  }
}

function folderForId(id: string, folders: string[]): string | undefined {
  return folders.find((f) => f.startsWith(`${id}-`));
}

export async function createEpic(input: CreateEpicInput, now: string): Promise<Ticket<EpicFrontmatter>> {
  const id = await nextEpicId();
  const slug = `${id}-${slugify(input.title) || "untitled"}`;
  const phase = input.phase ?? (await getActivePhase()) ?? undefined;
  const fm = validateEpicFrontmatter({
    id, title: input.title, status: "backlog", goal: input.goal,
    ...(phase ? { phase } : {}),
    created: now, updated: now,
  });
  const sections = {
    Description: input.description,
    "Success Criteria": input.successCriteria ?? "",
  };
  await ensureDir(paths().tasksDir(slug));
  await atomicWrite(paths().epicFile(slug), renderEpic(fm, sections));
  await regen();
  return { frontmatter: fm, sections, slug };
}

async function loadEpic(slug: string): Promise<Ticket<EpicFrontmatter>> {
  const raw = await readFileUtf8(paths().epicFile(slug));
  const parsed = parseTicket(raw, slug);
  return { frontmatter: validateEpicFrontmatter(parsed.frontmatter), sections: parsed.sections, slug };
}

export async function readEpic(slugOrId: string): Promise<Ticket<EpicFrontmatter>> {
  const folders = await epicFolders();
  const slug = folders.includes(slugOrId) ? slugOrId : folderForId(slugOrId, folders);
  if (!slug) {
    throw new EasyprmError("NOT_FOUND", `Epic not found: ${slugOrId}`, {
      next_steps: "Call list_epics to see available epics.",
    });
  }
  return loadEpic(slug);
}

export async function listEpics(filter: { phase?: string } = {}): Promise<Ticket<EpicFrontmatter>[]> {
  const folders = await epicFolders();
  const out: Ticket<EpicFrontmatter>[] = [];
  for (const slug of folders) {
    if (await exists(paths().epicFile(slug))) out.push(await loadEpic(slug));
  }
  let all = out.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id, undefined, { numeric: true }));
  if (filter.phase) all = all.filter((e) => e.frontmatter.phase === filter.phase);
  return all;
}

export interface UpdateEpicInput {
  status?: Status;
  goal?: string;
  title?: string;
  description?: string;
  successCriteria?: string;
  phase?: string;
}

export async function updateEpic(slugOrId: string, patch: UpdateEpicInput, now: string): Promise<Ticket<EpicFrontmatter>> {
  // slug is immutable — renaming the title does not move the folder on disk.
  const current = await readEpic(slugOrId);
  const fm = validateEpicFrontmatter({
    ...current.frontmatter,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.phase !== undefined ? { phase: patch.phase } : {}),
    updated: now,
  });
  const sections = {
    ...current.sections,
    ...(patch.description !== undefined ? { Description: patch.description } : {}),
    ...(patch.successCriteria !== undefined ? { "Success Criteria": patch.successCriteria } : {}),
  };
  await atomicWrite(paths().epicFile(current.slug), renderEpic(fm, sections));
  await regen();
  return { frontmatter: fm, sections, slug: current.slug };
}

async function regen(): Promise<void> {
  const { regenerateOverview } = await import("../overview/index.js");
  await regenerateOverview();
}
