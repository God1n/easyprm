import { existsSync } from "node:fs";
import matter from "gray-matter";
import { paths } from "../paths.js";
import { ensureDir, writeIfAbsent, readFileUtf8, atomicWrite } from "./fsutil.js";

const DEFAULT_DOCS: Record<string, string> = {
  "big-picture.md": `# Big Picture

## Problem
<What problem does this project solve, and for whom?>

## Vision
<What does success look like?>

## Goals
- <goal 1>
`,
  "sfr.md": `# Software Functional Requirements

<What the system must do, user-facing. One requirement per bullet.>

- FR1: <requirement>
`,
  "trf.md": `# Technical Requirements

<Stack, architecture, constraints.>

## Components

\`\`\`easyprm:components
# One component per line: <name>
# Relations: <name> -> <name>
api
db
api -> db
\`\`\`
`,
};

function projectTemplate(name: string): string {
  return `---
name: ${name}
active_phase: null
---

# ${name}

**Status:** planning

## Docs
- [Big Picture](docs/big-picture.md)
- [Functional Requirements](docs/sfr.md)
- [Technical Requirements](docs/trf.md)

## Overview
- [Kanban](overview/kanban.md)
- [Dependencies](overview/dependencies.md)
- [Architecture](overview/architecture.md)
- [Status](overview/status.md)
- [Phases](phases.md)
`;
}

export function projectExists(): boolean {
  return existsSync(paths().projectFile);
}

export async function initProject(name: string): Promise<{ created: string[] }> {
  const p = paths();
  await ensureDir(p.docs);
  await ensureDir(p.epics);
  await ensureDir(p.overview);

  const created: string[] = [];
  if (await writeIfAbsent(p.projectFile, projectTemplate(name))) created.push("project.md");
  for (const [file, body] of Object.entries(DEFAULT_DOCS)) {
    if (await writeIfAbsent(p.docFile(file), body)) created.push(`docs/${file}`);
  }
  return { created };
}

export async function readProject(): Promise<string> {
  return readFileUtf8(paths().projectFile);
}

export async function getActivePhase(): Promise<string | null> {
  const raw = await readFileUtf8(paths().projectFile);
  const m = matter(raw);
  const v = m.data.active_phase;
  return typeof v === "string" && v.length > 0 ? v : null;
}

export async function setActivePhaseField(phaseId: string | null): Promise<void> {
  const raw = await readFileUtf8(paths().projectFile);
  const m = matter(raw);
  const data = { ...m.data, active_phase: phaseId };
  const updated = matter.stringify(m.content, data);
  await atomicWrite(paths().projectFile, updated);
}
