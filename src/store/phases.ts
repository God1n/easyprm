import { readdir } from "node:fs/promises";
import matter from "gray-matter";
import { paths } from "../paths.js";
import { atomicWrite, ensureDir, readFileUtf8 } from "./fsutil.js";
import { validatePhaseFrontmatter, slugify } from "../schema.js";
import { nextPhaseId } from "../ids.js";
import { EasyprmError } from "../errors.js";
import { getActivePhase, setActivePhaseField } from "./project.js";
import type { PhaseFrontmatter, PhaseStatus } from "../types.js";

const SECTIONS = ["Description", "Success Criteria"] as const;
type PhaseSections = Record<(typeof SECTIONS)[number], string>;

export interface Phase {
  frontmatter: PhaseFrontmatter;
  sections: PhaseSections;
  slug: string;
}

export interface CreatePhaseInput {
  title: string;
  goal: string;
  description: string;
  successCriteria?: string;
}

function renderPhase(fm: PhaseFrontmatter, s: PhaseSections): string {
  const body =
    `# ${fm.id} · ${fm.title}\n\n` +
    SECTIONS.map((h) => `## ${h}\n\n${(s[h] ?? "").trim()}`).join("\n\n") +
    "\n";
  return matter.stringify(body, fm as unknown as object);
}

function splitSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = body.split("\n");
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => { if (current !== null) out[current] = buf.join("\n").trim(); buf = []; };
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) { flush(); current = m[1]; } else if (current !== null) buf.push(line);
  }
  flush();
  return out;
}

async function phaseFiles(): Promise<string[]> {
  try {
    return (await readdir(paths().phasesDir)).filter((f) => /^P\d+-.+\.md$/.test(f));
  } catch { return []; }
}

function fileForId(id: string, files: string[]): string | undefined {
  return files.find((f) => f.startsWith(`${id}-`));
}

async function loadPhase(stem: string): Promise<Phase> {
  try {
    const raw = await readFileUtf8(paths().phaseFile(stem));
    const m = matter(raw);
    const fm = validatePhaseFrontmatter(m.data);
    const sections = splitSections(m.content) as PhaseSections;
    return { frontmatter: fm, sections, slug: stem };
  } catch (e) {
    if (e instanceof EasyprmError) throw e;
    throw new EasyprmError("FILE_CONFLICT", `Unparseable phase file: ${stem}: ${(e as Error).message}`, {
      details: { slug: stem },
      next_steps: "Fix the YAML frontmatter in this phase file.",
    });
  }
}

export async function readPhase(id: string): Promise<Phase> {
  const files = await phaseFiles();
  const file = fileForId(id, files);
  if (!file) throw new EasyprmError("PHASE_NOT_FOUND", `Phase not found: ${id}`, { next_steps: "Call list_phases." });
  return loadPhase(file.replace(/\.md$/, ""));
}

export async function listPhases(): Promise<Phase[]> {
  const files = await phaseFiles();
  const out: Phase[] = [];
  for (const f of files) {
    const stem = f.replace(/\.md$/, "");
    try {
      out.push(await loadPhase(stem));
    } catch (err) {
      console.warn(`[easyprm] skipping unreadable phase file: ${stem} - ${(err as Error).message}`);
    }
  }
  return out.sort((a, b) =>
    a.frontmatter.id.localeCompare(b.frontmatter.id, undefined, { numeric: true }),
  );
}

export async function createPhase(input: CreatePhaseInput, now: string): Promise<Phase> {
  await ensureDir(paths().phasesDir);
  const id = await nextPhaseId();
  const slug = `${id}-${slugify(input.title) || "phase"}`;
  const fm = validatePhaseFrontmatter({
    id, title: input.title, status: "planning",
    goal: input.goal, created: now, updated: now,
  });
  const sections: PhaseSections = {
    Description: input.description,
    "Success Criteria": input.successCriteria ?? "",
  };
  await atomicWrite(paths().phaseFile(slug), renderPhase(fm, sections));
  await regen();
  return { frontmatter: fm, sections, slug };
}

export interface UpdatePhaseInput {
  status?: PhaseStatus;
  title?: string;
  goal?: string;
  description?: string;
  successCriteria?: string;
}

export async function updatePhase(id: string, patch: UpdatePhaseInput, now: string): Promise<Phase> {
  const current = await readPhase(id);
  const fm = validatePhaseFrontmatter({
    ...current.frontmatter,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
    updated: now,
  });
  const sections: PhaseSections = {
    Description: patch.description ?? current.sections.Description,
    "Success Criteria": patch.successCriteria ?? current.sections["Success Criteria"],
  };
  await atomicWrite(paths().phaseFile(current.slug), renderPhase(fm, sections));
  await regen();
  return { frontmatter: fm, sections, slug: current.slug };
}

export async function setActivePhase(id: string, now: string): Promise<Phase> {
  const target = await readPhase(id);
  if (target.frontmatter.status === "shipped") {
    throw new EasyprmError("VALIDATION_ERROR", `Cannot activate shipped phase ${id}.`, {
      field: "id",
      next_steps: "Use update_phase to set status='planning' first.",
    });
  }
  const prevId = await getActivePhase();
  if (prevId && prevId !== id) {
    try {
      const prev = await readPhase(prevId);
      if (prev.frontmatter.status === "active") {
        await updatePhase(prevId, { status: "planning" }, now);
      }
    } catch (e) {
      if (!(e instanceof EasyprmError && e.code === "PHASE_NOT_FOUND")) throw e;
    }
  }
  const promoted = await updatePhase(id, { status: "active" }, now);
  await setActivePhaseField(id);
  await regen();
  return promoted;
}

async function regen(): Promise<void> {
  const { regenerateOverview } = await import("../overview/index.js");
  await regenerateOverview();
}
