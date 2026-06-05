import { readdir } from "node:fs/promises";
import matter from "gray-matter";
import { paths } from "../paths.js";
import { atomicWrite, ensureDir, readFileUtf8 } from "./fsutil.js";
import { validateDecisionFrontmatter, slugify } from "../schema.js";
import { nextDecisionId } from "../ids.js";
import { EasyprmError } from "../errors.js";
import type { DecisionFrontmatter, DecisionStatus } from "../types.js";

const SECTIONS = ["Context", "Decision", "Consequences"] as const;
type DecisionSections = Record<(typeof SECTIONS)[number], string>;

export interface Decision {
  frontmatter: DecisionFrontmatter;
  sections: DecisionSections;
  slug: string;
}

export interface CreateDecisionInput {
  title: string;
  status?: DecisionStatus;
  epic?: string;
  supersedes?: string;
  context: string;
  decision: string;
  consequences: string;
}

function renderDecision(fm: DecisionFrontmatter, s: DecisionSections): string {
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

async function decisionFiles(): Promise<string[]> {
  try {
    return (await readdir(paths().decisionsDir)).filter((f) => /^\d{4}-.+\.md$/.test(f));
  } catch { return []; }
}

function fileForId(id: string, files: string[]): string | undefined {
  return files.find((f) => f.startsWith(`${id}-`));
}

async function loadDecision(stem: string): Promise<Decision> {
  try {
    const raw = await readFileUtf8(paths().decisionFile(stem));
    const m = matter(raw);
    const fm = validateDecisionFrontmatter(m.data);
    const sections = splitSections(m.content) as DecisionSections;
    return { frontmatter: fm, sections, slug: stem };
  } catch (e) {
    const msg = (e instanceof Error) ? e.message : String(e);
    throw new EasyprmError("FILE_CONFLICT", `Cannot read decision file: ${msg}`, {
      details: { slug: stem },
      next_steps: "Fix the YAML frontmatter in this decision file.",
    });
  }
}

export async function readDecision(id: string): Promise<Decision> {
  const files = await decisionFiles();
  const file = fileForId(id, files);
  if (!file) {
    throw new EasyprmError("DECISION_NOT_FOUND", `Decision not found: ${id}`, {
      next_steps: "Call list_decisions to see available decisions.",
    });
  }
  return loadDecision(file.replace(/\.md$/, ""));
}

export async function listDecisions(filter: { epic?: string; status?: DecisionStatus } = {}): Promise<Decision[]> {
  const files = await decisionFiles();
  const all: Decision[] = [];
  for (const f of files) {
    const stem = f.replace(/\.md$/, "");
    try {
      all.push(await loadDecision(stem));
    } catch (err) {
      console.warn(`[easyprm] skipping unreadable decision file: ${stem} - ${(err instanceof Error) ? err.message : String(err)}`);
    }
  }
  let out = all.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  if (filter.epic) out = out.filter((d) => d.frontmatter.epic === filter.epic);
  if (filter.status) out = out.filter((d) => d.frontmatter.status === filter.status);
  return out;
}

export async function createDecision(input: CreateDecisionInput, now: string): Promise<Decision> {
  await ensureDir(paths().decisionsDir);
  const id = await nextDecisionId();
  const slug = `${id}-${slugify(input.title) || "decision"}`;
  const fm = validateDecisionFrontmatter({
    id,
    title: input.title,
    status: input.status ?? "accepted",
    ...(input.epic ? { epic: input.epic } : {}),
    ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    date: now,
  });
  const sections: DecisionSections = {
    Context: input.context,
    Decision: input.decision,
    Consequences: input.consequences,
  };
  await atomicWrite(paths().decisionFile(slug), renderDecision(fm, sections));
  await regen();
  return { frontmatter: fm, sections, slug };
}

export interface UpdateDecisionInput {
  status?: DecisionStatus;
  title?: string;
  epic?: string;
  supersedes?: string;
  context?: string;
  decision?: string;
  consequences?: string;
}

export async function updateDecision(id: string, patch: UpdateDecisionInput, now: string): Promise<Decision> {
  const current = await readDecision(id);
  const fm = validateDecisionFrontmatter({
    ...current.frontmatter,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.epic !== undefined ? { epic: patch.epic } : {}),
    ...(patch.supersedes !== undefined ? { supersedes: patch.supersedes } : {}),
    date: now,
  });
  const sections: DecisionSections = {
    Context: patch.context ?? current.sections.Context,
    Decision: patch.decision ?? current.sections.Decision,
    Consequences: patch.consequences ?? current.sections.Consequences,
  };
  await atomicWrite(paths().decisionFile(current.slug), renderDecision(fm, sections));
  await regen();
  return { frontmatter: fm, sections, slug: current.slug };
}

async function regen(): Promise<void> {
  const { regenerateOverview } = await import("../overview/index.js");
  await regenerateOverview();
}
