# easyprm MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `easyprm`, a file-based project management MCP server (TypeScript/Node) that owns a `.claude/easyprm/` doc tree and exposes tools to plan a project end-to-end and stay on the plan while building.

**Architecture:** A pure, testable core (frontmatter parsing, ID assignment, dependency DAG, deterministic overview generation) wrapped by thin MCP tool handlers. Tickets and docs are *authored*; `overview/` files are *derived* and regenerated on every mutation. Every tool returns `{ ok, data, next_steps }` on success or a unified `{ ok: false, error }` on failure.

**Tech Stack:** TypeScript (ESM, NodeNext), `@modelcontextprotocol/sdk` (McpServer + stdio), `zod` (validation), `gray-matter` (YAML frontmatter parse/serialize), `vitest` (testing), `tsx` (dev run), `tsc` (build). Distributed via `npx` with a `bin` entry.

The server reads/writes files under a target project's `.claude/easyprm/`. The base directory is resolved from `process.env.EASYPRM_ROOT` if set, else `process.cwd()`. Tests inject a temp directory via `EASYPRM_ROOT`.

---

## File Structure

Server source (`src/`):

- `src/paths.ts` — resolves all paths under `.claude/easyprm/` from the configured root.
- `src/types.ts` — shared types: `Status`, `STATUSES`, `TaskFrontmatter`, `EpicFrontmatter`, `Ticket`, `Ok` envelope.
- `src/errors.ts` — `EasyprmError` class, `ErrorCode` union, `ok()` helper.
- `src/frontmatter.ts` — parse/serialize ticket markdown (frontmatter + named sections), checkbox parsing.
- `src/schema.ts` — zod schemas for task/epic frontmatter and tool inputs.
- `src/ids.ts` — next epic/task ID assignment by scanning the tree.
- `src/store/project.ts` — `initProject`, `projectExists`, `readProject`.
- `src/store/docs.ts` — `listDocs`, `readDoc`, `writeDoc`.
- `src/store/epics.ts` — `createEpic`, `updateEpic`, `listEpics`, `readEpic`.
- `src/store/tasks.ts` — `createTask`, `getTask`, `listTasks`, `updateTask`, `addComment`, `loadAllTasks`.
- `src/dag.ts` — `detectCycle`, `getNextTask`, dependency helpers.
- `src/overview/kanban.ts` — render `kanban.md`.
- `src/overview/dependencies.ts` — render `dependencies.md` (Mermaid DAG).
- `src/overview/architecture.ts` — render `architecture.md` (Mermaid from `trf.md` components block).
- `src/overview/status.ts` — render `status.md`.
- `src/overview/index.ts` — `regenerateOverview` orchestrator.
- `src/tools.ts` — registers all MCP tools on an `McpServer`.
- `src/index.ts` — server entry: builds server, connects stdio transport. Has `#!/usr/bin/env node` shebang (the `bin`).

Tests (`tests/`): one file per source module + `tests/integration.test.ts`.

---

## Phase 0 — Project scaffold

### Task 0: Initialize the Node/TypeScript project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts` (placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "easyprm",
  "version": "0.1.0",
  "description": "File-based project management MCP server for solo developers building with AI.",
  "type": "module",
  "bin": { "easyprm": "dist/index.js" },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "gray-matter": "^4.0.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules
dist
*.log
.DS_Store
```

- [ ] **Step 5: Create placeholder `src/index.ts`**

```ts
// Entry point — implemented in Phase 7.
export {};
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules/` populated, no peer-dependency errors.

- [ ] **Step 7: Verify the toolchain runs**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` reports no errors; vitest reports "No test files found" (exit 0). If vitest exits non-zero on no tests, that's fine for now — proceed.

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold easyprm TypeScript MCP project"
```

(If `git init` was already run to commit the spec, skip it.)

---

## Phase 1 — Foundation

### Task 1: Path resolution

**Files:**
- Create: `src/paths.ts`
- Test: `tests/paths.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/paths.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { paths } from "../src/paths.js";

describe("paths", () => {
  afterEach(() => { delete process.env.EASYPRM_ROOT; });

  it("roots everything under .claude/easyprm of EASYPRM_ROOT", () => {
    process.env.EASYPRM_ROOT = "/tmp/proj";
    const p = paths();
    expect(p.base).toBe("/tmp/proj/.claude/easyprm");
    expect(p.docs).toBe("/tmp/proj/.claude/easyprm/docs");
    expect(p.epics).toBe("/tmp/proj/.claude/easyprm/epics");
    expect(p.overview).toBe("/tmp/proj/.claude/easyprm/overview");
    expect(p.projectFile).toBe("/tmp/proj/.claude/easyprm/project.md");
  });

  it("returns per-epic and per-task paths", () => {
    process.env.EASYPRM_ROOT = "/tmp/proj";
    const p = paths();
    expect(p.epicDir("E1-auth")).toBe("/tmp/proj/.claude/easyprm/epics/E1-auth");
    expect(p.epicFile("E1-auth")).toBe("/tmp/proj/.claude/easyprm/epics/E1-auth/epic.md");
    expect(p.taskFile("E1-auth", "E1-T1-login")).toBe(
      "/tmp/proj/.claude/easyprm/epics/E1-auth/tasks/E1-T1-login.md"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/paths.test.ts`
Expected: FAIL — cannot find module `../src/paths.js`.

- [ ] **Step 3: Implement `src/paths.ts`**

```ts
import path from "node:path";

export interface Paths {
  root: string;
  base: string;
  docs: string;
  epics: string;
  overview: string;
  projectFile: string;
  epicDir: (epicFolder: string) => string;
  epicFile: (epicFolder: string) => string;
  tasksDir: (epicFolder: string) => string;
  taskFile: (epicFolder: string, taskFile: string) => string;
  overviewFile: (name: string) => string;
  docFile: (name: string) => string;
}

export function paths(): Paths {
  const root = process.env.EASYPRM_ROOT ?? process.cwd();
  const base = path.join(root, ".claude", "easyprm");
  const epics = path.join(base, "epics");
  return {
    root,
    base,
    docs: path.join(base, "docs"),
    epics,
    overview: path.join(base, "overview"),
    projectFile: path.join(base, "project.md"),
    epicDir: (e) => path.join(epics, e),
    epicFile: (e) => path.join(epics, e, "epic.md"),
    tasksDir: (e) => path.join(epics, e, "tasks"),
    taskFile: (e, t) => path.join(epics, e, "tasks", `${t}.md`),
    overviewFile: (name) => path.join(base, "overview", name),
    docFile: (name) => path.join(base, "docs", name),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/paths.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/paths.ts tests/paths.test.ts
git commit -m "feat: path resolution for easyprm tree"
```

---

### Task 2: Shared types and error model

**Files:**
- Create: `src/types.ts`
- Create: `src/errors.ts`
- Test: `tests/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/errors.test.ts`
Expected: FAIL — cannot find module `../src/errors.js`.

- [ ] **Step 3: Implement `src/types.ts`**

```ts
export type Status =
  | "backlog"
  | "todo"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done";

export const STATUSES: Status[] = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
];

export interface TaskFrontmatter {
  id: string;
  title: string;
  epic: string;
  status: Status;
  depends_on: string[];
  tags: string[];
  created: string;
  updated: string;
}

export interface EpicFrontmatter {
  id: string;
  title: string;
  status: Status;
  goal: string;
  created: string;
  updated: string;
}

export interface Ticket<F> {
  frontmatter: F;
  /** Heading text (without `##`) -> raw body lines as a single string. */
  sections: Record<string, string>;
  /** Folder name on disk, e.g. "E1-auth" or task file stem "E1-T1-login". */
  slug: string;
}

export interface Ok<T> {
  ok: true;
  data: T;
  next_steps: string;
}
```

- [ ] **Step 4: Implement `src/errors.ts`**

```ts
import type { Ok } from "./types.js";

export type ErrorCode =
  | "NOT_INITIALIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DEPENDENCY_INVALID"
  | "DEPENDENCY_CYCLE"
  | "DOD_NOT_MET"
  | "ID_CONFLICT"
  | "FILE_CONFLICT";

export interface ErrorOpts {
  field?: string;
  details?: unknown;
  recoverable?: boolean;
  next_steps?: string;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
    details?: unknown;
    recoverable: boolean;
    next_steps?: string;
  };
}

export class EasyprmError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public opts: ErrorOpts = {},
  ) {
    super(message);
    this.name = "EasyprmError";
  }

  toResponse(): ErrorResponse {
    const { field, details, recoverable, next_steps } = this.opts;
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        ...(field !== undefined ? { field } : {}),
        ...(details !== undefined ? { details } : {}),
        recoverable: recoverable ?? true,
        ...(next_steps !== undefined ? { next_steps } : {}),
      },
    };
  }
}

export function ok<T>(data: T, next_steps: string): Ok<T> {
  return { ok: true, data, next_steps };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/errors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/errors.ts tests/errors.test.ts
git commit -m "feat: shared types and unified error model"
```

---

### Task 3: Frontmatter and section parsing

**Files:**
- Create: `src/frontmatter.ts`
- Test: `tests/frontmatter.test.ts`

The canonical task section order is fixed so serialization is deterministic.

- [ ] **Step 1: Write the failing test**

```ts
// tests/frontmatter.test.ts
import { describe, it, expect } from "vitest";
import {
  parseTicket,
  renderTask,
  parseCheckboxes,
  TASK_SECTIONS,
} from "../src/frontmatter.js";

const SAMPLE = `---
id: E1-T1
title: Login
status: todo
---

# E1-T1 · Login

## User Story
As a user I want to log in.

## How To Test
- [ ] unit passes
- [x] manual done
`;

describe("frontmatter", () => {
  it("parses frontmatter and named sections", () => {
    const t = parseTicket(SAMPLE, "E1-T1-login");
    expect(t.frontmatter.id).toBe("E1-T1");
    expect(t.frontmatter.status).toBe("todo");
    expect(t.sections["User Story"].trim()).toBe("As a user I want to log in.");
    expect(t.sections["How To Test"]).toContain("- [ ] unit passes");
    expect(t.slug).toBe("E1-T1-login");
  });

  it("parseCheckboxes extracts text and checked state", () => {
    const boxes = parseCheckboxes("- [ ] unit passes\n- [x] manual done\nnot a box");
    expect(boxes).toEqual([
      { text: "unit passes", checked: false },
      { text: "manual done", checked: true },
    ]);
  });

  it("renderTask round-trips frontmatter and known sections in fixed order", () => {
    const md = renderTask(
      {
        id: "E1-T1",
        title: "Login",
        epic: "E1",
        status: "todo",
        depends_on: [],
        tags: [],
        created: "2026-06-05",
        updated: "2026-06-05",
      },
      { "User Story": "As a user I want to log in." },
    );
    expect(md).toContain("id: E1-T1");
    expect(md).toContain("# E1-T1 · Login");
    // every canonical section heading is present
    for (const h of TASK_SECTIONS) expect(md).toContain(`## ${h}`);
    // round-trips
    const reparsed = parseTicket(md, "E1-T1-login");
    expect(reparsed.frontmatter.id).toBe("E1-T1");
    expect(reparsed.sections["User Story"].trim()).toBe(
      "As a user I want to log in.",
    );
  });

  it("throws FILE_CONFLICT on unparseable frontmatter", () => {
    expect(() => parseTicket("no frontmatter here", "x")).toThrowError(
      /FILE_CONFLICT|frontmatter/i,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: FAIL — cannot find module `../src/frontmatter.js`.

- [ ] **Step 3: Implement `src/frontmatter.ts`**

```ts
import matter from "gray-matter";
import { EasyprmError } from "./errors.js";
import type { TaskFrontmatter, EpicFrontmatter, Ticket } from "./types.js";

export const TASK_SECTIONS = [
  "User Story",
  "Description",
  "What To Do",
  "What Is Done",
  "How To Test",
  "Technical Summary",
  "Comments",
] as const;

export const EPIC_SECTIONS = ["Description", "Success Criteria"] as const;

export interface Checkbox {
  text: string;
  checked: boolean;
}

/** Parse a ticket markdown string into frontmatter + named sections. */
export function parseTicket(raw: string, slug: string): Ticket<Record<string, unknown>> {
  let parsed;
  try {
    parsed = matter(raw);
  } catch (e) {
    throw new EasyprmError("FILE_CONFLICT", `Unparseable frontmatter in ${slug}: ${(e as Error).message}`, {
      details: { slug },
      next_steps: "Fix the YAML frontmatter, or run regenerate_overview after correcting the file.",
    });
  }
  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    throw new EasyprmError("FILE_CONFLICT", `Missing frontmatter in ${slug}.`, {
      details: { slug },
      next_steps: "Add a YAML frontmatter block delimited by --- at the top of the file.",
    });
  }
  return { frontmatter: parsed.data, sections: splitSections(parsed.content), slug };
}

/** Split markdown body into a map of `## Heading` -> body text. */
function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = body.split("\n");
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current !== null) sections[current] = buf.join("\n").trim();
    buf = [];
  };
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      current = m[1];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

/** Extract checkbox items from a section body. */
export function parseCheckboxes(sectionBody: string): Checkbox[] {
  const out: Checkbox[] = [];
  for (const line of sectionBody.split("\n")) {
    const m = /^\s*-\s*\[( |x|X)\]\s+(.*\S)\s*$/.exec(line);
    if (m) out.push({ text: m[2], checked: m[1].toLowerCase() === "x" });
  }
  return out;
}

function renderSections(
  headings: readonly string[],
  sections: Record<string, string>,
): string {
  return headings
    .map((h) => `## ${h}\n\n${(sections[h] ?? "").trim()}`.trimEnd())
    .join("\n\n");
}

export function renderTask(
  fm: TaskFrontmatter,
  sections: Record<string, string>,
): string {
  const body = `# ${fm.id} · ${fm.title}\n\n${renderSections(TASK_SECTIONS, sections)}\n`;
  return matter.stringify(body, fm as unknown as object);
}

export function renderEpic(
  fm: EpicFrontmatter,
  sections: Record<string, string>,
): string {
  const body = `# ${fm.id} · ${fm.title}\n\n${renderSections(EPIC_SECTIONS, sections)}\n`;
  return matter.stringify(body, fm as unknown as object);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/frontmatter.ts tests/frontmatter.test.ts
git commit -m "feat: ticket frontmatter and section parsing/rendering"
```

---

### Task 4: Zod schemas and validation

**Files:**
- Create: `src/schema.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/schema.test.ts
import { describe, it, expect } from "vitest";
import { validateTaskFrontmatter, slugify } from "../src/schema.js";
import { EasyprmError } from "../src/errors.js";

describe("schema", () => {
  it("accepts a valid task frontmatter", () => {
    const fm = validateTaskFrontmatter({
      id: "E1-T1",
      title: "Login",
      epic: "E1",
      status: "todo",
      depends_on: [],
      tags: [],
      created: "2026-06-05",
      updated: "2026-06-05",
    });
    expect(fm.status).toBe("todo");
  });

  it("rejects an invalid status with a VALIDATION_ERROR naming the field", () => {
    try {
      validateTaskFrontmatter({
        id: "E1-T1", title: "x", epic: "E1", status: "nope",
        depends_on: [], tags: [], created: "2026-06-05", updated: "2026-06-05",
      });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(EasyprmError);
      const err = e as EasyprmError;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.opts.field).toContain("status");
    }
  });

  it("slugify lowercases and dasherizes", () => {
    expect(slugify("Add JWT Refresh-Token Rotation!")).toBe("add-jwt-refresh-token-rotation");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schema.test.ts`
Expected: FAIL — cannot find module `../src/schema.js`.

- [ ] **Step 3: Implement `src/schema.ts`**

```ts
import { z } from "zod";
import { STATUSES } from "./types.js";
import type { TaskFrontmatter, EpicFrontmatter } from "./types.js";
import { EasyprmError } from "./errors.js";

const statusSchema = z.enum(STATUSES as [string, ...string[]]);

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/schema.ts tests/schema.test.ts
git commit -m "feat: zod frontmatter validation and slugify"
```

---

### Task 5: ID assignment

**Files:**
- Create: `src/ids.ts`
- Test: `tests/ids.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ids.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { nextEpicId, nextTaskId } from "../src/ids.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-ids-"));
  process.env.EASYPRM_ROOT = root;
  mkdirSync(path.join(root, ".claude/easyprm/epics"), { recursive: true });
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("ids", () => {
  it("returns E1 when no epics exist", async () => {
    expect(await nextEpicId()).toBe("E1");
  });

  it("returns the next epic number after existing epics", async () => {
    mkdirSync(path.join(root, ".claude/easyprm/epics/E1-auth"));
    mkdirSync(path.join(root, ".claude/easyprm/epics/E3-billing"));
    expect(await nextEpicId()).toBe("E4");
  });

  it("returns E1-T1 when an epic has no tasks", async () => {
    mkdirSync(path.join(root, ".claude/easyprm/epics/E1-auth/tasks"), { recursive: true });
    expect(await nextTaskId("E1-auth")).toBe("E1-T1");
  });

  it("returns the next task number within an epic", async () => {
    const tasks = path.join(root, ".claude/easyprm/epics/E1-auth/tasks");
    mkdirSync(tasks, { recursive: true });
    mkdirSync(path.join(tasks, "..", "tasks"), { recursive: true });
    // create two task files
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(tasks, "E1-T1-a.md"), "");
    writeFileSync(path.join(tasks, "E1-T2-b.md"), "");
    expect(await nextTaskId("E1-auth")).toBe("E1-T3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ids.test.ts`
Expected: FAIL — cannot find module `../src/ids.js`.

- [ ] **Step 3: Implement `src/ids.ts`**

```ts
import { readdir } from "node:fs/promises";
import { paths } from "./paths.js";

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

/** Highest existing epic number + 1, formatted "E<n>". */
export async function nextEpicId(): Promise<string> {
  const entries = await safeReaddir(paths().epics);
  let max = 0;
  for (const name of entries) {
    const m = /^E(\d+)-/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `E${max + 1}`;
}

/** Next task id within an epic, formatted "<epicId>-T<n>". */
export async function nextTaskId(epicFolder: string): Promise<string> {
  const epicId = /^(E\d+)-/.exec(epicFolder)?.[1];
  if (!epicId) throw new Error(`Bad epic folder name: ${epicFolder}`);
  const entries = await safeReaddir(paths().tasksDir(epicFolder));
  let max = 0;
  for (const name of entries) {
    const m = new RegExp(`^${epicId}-T(\\d+)-`).exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${epicId}-T${max + 1}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ids.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ids.ts tests/ids.test.ts
git commit -m "feat: sequential epic/task ID assignment"
```

---

## Phase 2 — Store: project init & docs

### Task 6: Atomic file helpers + project init

**Files:**
- Create: `src/store/fsutil.ts`
- Create: `src/store/project.ts`
- Test: `tests/project.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/project.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject, projectExists } from "../src/store/project.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-proj-"));
  process.env.EASYPRM_ROOT = root;
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

const base = () => path.join(root, ".claude/easyprm");

describe("initProject", () => {
  it("creates the full tree and seeds default docs", async () => {
    expect(projectExists()).toBe(false);
    await initProject("My App");
    expect(projectExists()).toBe(true);
    expect(existsSync(path.join(base(), "project.md"))).toBe(true);
    expect(existsSync(path.join(base(), "docs/big-picture.md"))).toBe(true);
    expect(existsSync(path.join(base(), "docs/sfr.md"))).toBe(true);
    expect(existsSync(path.join(base(), "docs/trf.md"))).toBe(true);
    expect(existsSync(path.join(base(), "epics"))).toBe(true);
    expect(existsSync(path.join(base(), "overview"))).toBe(true);
    expect(readFileSync(path.join(base(), "project.md"), "utf8")).toContain("My App");
  });

  it("is idempotent — re-init does not overwrite an existing doc", async () => {
    await initProject("My App");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(base(), "docs/big-picture.md"), "EDITED");
    await initProject("My App");
    expect(readFileSync(path.join(base(), "docs/big-picture.md"), "utf8")).toBe("EDITED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/project.test.ts`
Expected: FAIL — cannot find module `../src/store/project.js`.

- [ ] **Step 3: Implement `src/store/fsutil.ts`**

```ts
import { mkdir, writeFile, rename, readFile, access } from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Atomic write: write to a temp file then rename into place. */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp-${process.pid}`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, filePath);
}

/** Write only if the file does not already exist. Returns true if written. */
export async function writeIfAbsent(filePath: string, content: string): Promise<boolean> {
  if (await exists(filePath)) return false;
  await atomicWrite(filePath, content);
  return true;
}

export async function readFileUtf8(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}
```

- [ ] **Step 4: Implement `src/store/project.ts`**

```ts
import { paths } from "../paths.js";
import { ensureDir, exists, writeIfAbsent, atomicWrite, readFileUtf8 } from "./fsutil.js";

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
  return `# ${name}

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
`;
}

export function projectExists(): boolean {
  // sync-friendly check used by tools before doing work
  const fs = require("node:fs") as typeof import("node:fs");
  return fs.existsSync(paths().projectFile);
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
```

> Note: `projectExists` uses `require` for a synchronous check. Because the file is ESM, add `import { createRequire } from "node:module"; const require = createRequire(import.meta.url);` at the top of `project.ts`. Update the implementation accordingly.

- [ ] **Step 5: Fix the ESM `require` shim in `src/store/project.ts`**

Add at the top of the file:

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/project.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/store/fsutil.ts src/store/project.ts tests/project.test.ts
git commit -m "feat: atomic fs helpers and idempotent project init"
```

---

### Task 7: Docs store

**Files:**
- Create: `src/store/docs.ts`
- Test: `tests/docs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/docs.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { listDocs, readDoc, writeDoc } from "../src/store/docs.js";
import { EasyprmError } from "../src/errors.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-docs-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("docs store", () => {
  it("lists seeded docs", async () => {
    const docs = await listDocs();
    expect(docs.sort()).toEqual(["big-picture.md", "sfr.md", "trf.md"]);
  });

  it("writes a new doc and reads it back", async () => {
    await writeDoc("db.md", "# Database\n");
    expect(await readDoc("db.md")).toBe("# Database\n");
    expect(await listDocs()).toContain("db.md");
  });

  it("normalizes a name without .md extension", async () => {
    await writeDoc("api", "# API\n");
    expect(await listDocs()).toContain("api.md");
  });

  it("rejects path traversal in the doc name", async () => {
    await expect(writeDoc("../escape.md", "x")).rejects.toBeInstanceOf(EasyprmError);
  });

  it("throws NOT_FOUND reading a missing doc", async () => {
    await expect(readDoc("nope.md")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/docs.test.ts`
Expected: FAIL — cannot find module `../src/store/docs.js`.

- [ ] **Step 3: Implement `src/store/docs.ts`**

```ts
import { readdir } from "node:fs/promises";
import { paths } from "../paths.js";
import { atomicWrite, exists, readFileUtf8 } from "./fsutil.js";
import { EasyprmError } from "../errors.js";

function normalizeDocName(name: string): string {
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    throw new EasyprmError("VALIDATION_ERROR", `Illegal doc name: ${name}`, {
      field: "name",
      next_steps: "Use a plain file name like 'db.md' — no slashes or '..'.",
    });
  }
  return name.endsWith(".md") ? name : `${name}.md`;
}

export async function listDocs(): Promise<string[]> {
  try {
    return (await readdir(paths().docs)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

export async function readDoc(name: string): Promise<string> {
  const file = paths().docFile(normalizeDocName(name));
  if (!(await exists(file))) {
    throw new EasyprmError("NOT_FOUND", `Doc not found: ${name}`, {
      field: "name",
      next_steps: "Call list_docs to see available docs.",
    });
  }
  return readFileUtf8(file);
}

export async function writeDoc(name: string, content: string): Promise<string> {
  const normalized = normalizeDocName(name);
  await atomicWrite(paths().docFile(normalized), content);
  return normalized;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/docs.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/docs.ts tests/docs.test.ts
git commit -m "feat: docs store with traversal guard"
```

---

## Phase 3 — Store: epics

### Task 8: Epics store

**Files:**
- Create: `src/store/epics.ts`
- Test: `tests/epics.test.ts`

`NOW` is injected as a parameter (date string) so tests are deterministic — no `Date.now()` inside the store.

- [ ] **Step 1: Write the failing test**

```ts
// tests/epics.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic, listEpics, readEpic, updateEpic } from "../src/store/epics.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-epics-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("epics store", () => {
  it("creates an epic with assigned id and folder", async () => {
    const epic = await createEpic(
      { title: "Authentication", goal: "Users can sign in", description: "Auth flows" },
      "2026-06-05",
    );
    expect(epic.frontmatter.id).toBe("E1");
    expect(epic.slug).toBe("E1-authentication");
    expect(epic.frontmatter.status).toBe("backlog");
  });

  it("lists epics", async () => {
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
    await createEpic({ title: "Billing", goal: "g", description: "d" }, "2026-06-05");
    const epics = await listEpics();
    expect(epics.map((e) => e.frontmatter.id).sort()).toEqual(["E1", "E2"]);
  });

  it("updates epic status and bumps updated date", async () => {
    const epic = await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
    const updated = await updateEpic(epic.slug, { status: "in_progress" }, "2026-06-06");
    expect(updated.frontmatter.status).toBe("in_progress");
    expect(updated.frontmatter.updated).toBe("2026-06-06");
    const reread = await readEpic(epic.slug);
    expect(reread.frontmatter.status).toBe("in_progress");
  });

  it("throws NOT_FOUND for an unknown epic", async () => {
    await expect(readEpic("E9-ghost")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/epics.test.ts`
Expected: FAIL — cannot find module `../src/store/epics.js`.

- [ ] **Step 3: Implement `src/store/epics.ts`**

```ts
import { readdir } from "node:fs/promises";
import { paths } from "../paths.js";
import { atomicWrite, exists, ensureDir, readFileUtf8 } from "./fsutil.js";
import { parseTicket, renderEpic } from "../frontmatter.js";
import { validateEpicFrontmatter, slugify } from "../schema.js";
import { nextEpicId } from "../ids.js";
import { EasyprmError } from "../errors.js";
import type { EpicFrontmatter, Ticket, Status } from "../types.js";

export interface CreateEpicInput {
  title: string;
  goal: string;
  description: string;
  successCriteria?: string;
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
  const slug = `${id}-${slugify(input.title)}`;
  const fm = validateEpicFrontmatter({
    id, title: input.title, status: "backlog", goal: input.goal, created: now, updated: now,
  });
  const sections = {
    Description: input.description,
    "Success Criteria": input.successCriteria ?? "",
  };
  await ensureDir(paths().tasksDir(slug));
  await atomicWrite(paths().epicFile(slug), renderEpic(fm, sections));
  return { frontmatter: fm, sections, slug };
}

export async function readEpic(slugOrId: string): Promise<Ticket<EpicFrontmatter>> {
  const folders = await epicFolders();
  const slug = folders.includes(slugOrId) ? slugOrId : folderForId(slugOrId, folders);
  if (!slug) {
    throw new EasyprmError("NOT_FOUND", `Epic not found: ${slugOrId}`, {
      next_steps: "Call list_epics to see available epics.",
    });
  }
  const raw = await readFileUtf8(paths().epicFile(slug));
  const parsed = parseTicket(raw, slug);
  return { frontmatter: validateEpicFrontmatter(parsed.frontmatter), sections: parsed.sections, slug };
}

export async function listEpics(): Promise<Ticket<EpicFrontmatter>[]> {
  const folders = await epicFolders();
  const out: Ticket<EpicFrontmatter>[] = [];
  for (const slug of folders) {
    if (await exists(paths().epicFile(slug))) out.push(await readEpic(slug));
  }
  return out.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id, undefined, { numeric: true }));
}

export interface UpdateEpicInput {
  status?: Status;
  goal?: string;
  title?: string;
  description?: string;
  successCriteria?: string;
}

export async function updateEpic(slugOrId: string, patch: UpdateEpicInput, now: string): Promise<Ticket<EpicFrontmatter>> {
  const current = await readEpic(slugOrId);
  const fm = validateEpicFrontmatter({
    ...current.frontmatter,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    updated: now,
  });
  const sections = {
    ...current.sections,
    ...(patch.description !== undefined ? { Description: patch.description } : {}),
    ...(patch.successCriteria !== undefined ? { "Success Criteria": patch.successCriteria } : {}),
  };
  await atomicWrite(paths().epicFile(current.slug), renderEpic(fm, sections));
  return { frontmatter: fm, sections, slug: current.slug };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/epics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/epics.ts tests/epics.test.ts
git commit -m "feat: epics store (create/read/list/update)"
```

---

## Phase 4 — Store: tasks

### Task 9: Tasks store — create, read, list

**Files:**
- Create: `src/store/tasks.ts`
- Test: `tests/tasks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/tasks.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic } from "../src/store/epics.js";
import { createTask, getTask, listTasks, loadAllTasks } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tasks-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
  await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("tasks store: create/read/list", () => {
  it("creates a task with assigned id under its epic", async () => {
    const t = await createTask(
      { epic: "E1", title: "Login form", userStory: "As a user...", whatToDo: "- [ ] build form" },
      "2026-06-05",
    );
    expect(t.frontmatter.id).toBe("E1-T1");
    expect(t.frontmatter.epic).toBe("E1");
    expect(t.frontmatter.status).toBe("backlog");
    expect(t.sections["What To Do"]).toContain("build form");
  });

  it("rejects creating a task for a missing epic", async () => {
    await expect(
      createTask({ epic: "E9", title: "x" }, "2026-06-05"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects depends_on referencing a non-existent task", async () => {
    await expect(
      createTask({ epic: "E1", title: "x", dependsOn: ["E1-T99"] }, "2026-06-05"),
    ).rejects.toMatchObject({ code: "DEPENDENCY_INVALID" });
  });

  it("gets a task by id and lists with filters", async () => {
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    await createTask({ epic: "E1", title: "B", tags: ["ui"] }, "2026-06-05");
    expect((await getTask("E1-T1")).frontmatter.title).toBe("A");
    expect((await listTasks({ epic: "E1" })).length).toBe(2);
    expect((await listTasks({ tag: "ui" })).length).toBe(1);
    expect((await loadAllTasks()).length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tasks.test.ts`
Expected: FAIL — cannot find module `../src/store/tasks.js`.

- [ ] **Step 3: Implement `src/store/tasks.ts` (create/read/list portion)**

```ts
import { readdir } from "node:fs/promises";
import { paths } from "../paths.js";
import { atomicWrite, exists, readFileUtf8 } from "./fsutil.js";
import { parseTicket, renderTask } from "../frontmatter.js";
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
async function locateTask(taskId: string): Promise<TaskLocation | undefined> {
  const epicId = /^(E\d+)-T\d+$/.exec(taskId)?.[1];
  if (!epicId) return undefined;
  for (const epic of await listEpics()) {
    if (epic.frontmatter.id !== epicId) continue;
    for (const f of await taskFilesIn(epic.slug)) {
      if (f.startsWith(`${taskId}-`)) return { epicSlug: epic.slug, fileStem: f.replace(/\.md$/, "") };
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

// updateTask, addComment — added in Task 10.
export { locateTask };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tasks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/tasks.ts tests/tasks.test.ts
git commit -m "feat: tasks store create/read/list with dependency validation"
```

---

### Task 10: Tasks store — update (with DoD guard) and comments

**Files:**
- Modify: `src/store/tasks.ts` (append `updateTask`, `addComment`, helper)
- Test: `tests/task-update.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/task-update.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic } from "../src/store/epics.js";
import { createTask, updateTask, addComment, getTask } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tu-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
  await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("updateTask", () => {
  it("updates status to non-done freely", async () => {
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    const u = await updateTask("E1-T1", { status: "in_progress" }, "2026-06-06");
    expect(u.frontmatter.status).toBe("in_progress");
    expect(u.frontmatter.updated).toBe("2026-06-06");
  });

  it("blocks → done when How To Test boxes are unchecked (DOD_NOT_MET)", async () => {
    await createTask(
      { epic: "E1", title: "A", howToTest: "- [ ] unit\n- [ ] manual" },
      "2026-06-05",
    );
    await expect(
      updateTask("E1-T1", { status: "done" }, "2026-06-06"),
    ).rejects.toMatchObject({ code: "DOD_NOT_MET" });
  });

  it("allows → done when all How To Test boxes are checked", async () => {
    await createTask(
      { epic: "E1", title: "A", howToTest: "- [x] unit\n- [x] manual" },
      "2026-06-05",
    );
    const u = await updateTask("E1-T1", { status: "done" }, "2026-06-06");
    expect(u.frontmatter.status).toBe("done");
  });

  it("allows → done when How To Test has no checkboxes (nothing to satisfy)", async () => {
    await createTask({ epic: "E1", title: "A", howToTest: "manual smoke test" }, "2026-06-05");
    const u = await updateTask("E1-T1", { status: "done" }, "2026-06-06");
    expect(u.frontmatter.status).toBe("done");
  });

  it("appends a timestamped comment", async () => {
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    await addComment("E1-T1", "AI", "blocked on infra", "2026-06-06");
    const t = await getTask("E1-T1");
    expect(t.sections["Comments"]).toContain("2026-06-06 (AI): blocked on infra");
  });

  it("rejects updating dependencies to a cycle is handled at DAG layer, not here", async () => {
    // depends_on validation against existence only
    await createTask({ epic: "E1", title: "A" }, "2026-06-05");
    await expect(
      updateTask("E1-T1", { dependsOn: ["E1-T42"] }, "2026-06-06"),
    ).rejects.toMatchObject({ code: "DEPENDENCY_INVALID" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/task-update.test.ts`
Expected: FAIL — `updateTask`/`addComment` not exported.

- [ ] **Step 3: Append to `src/store/tasks.ts`**

Add these imports at the top (merge with existing import from `../frontmatter.js`):

```ts
import { parseTicket, renderTask, parseCheckboxes } from "../frontmatter.js";
```

Append below `createTask`:

```ts
export interface UpdateTaskInput {
  status?: TaskFrontmatter["status"];
  title?: string;
  dependsOn?: string[];
  tags?: string[];
  sections?: Partial<Record<
    "User Story" | "Description" | "What To Do" | "What Is Done" | "How To Test" | "Technical Summary",
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
  return updateTask(taskId, { sections: { ...current.sections, Comments: updated } as UpdateTaskInput["sections"] }, now);
}
```

> Note: `addComment` passes `Comments` through `sections`. Extend `UpdateTaskInput["sections"]` to also accept `"Comments"`. Update the `sections` type union in `UpdateTaskInput` to include `"Comments"`.

- [ ] **Step 4: Fix the `UpdateTaskInput` sections union**

Change the `sections` field type in `UpdateTaskInput` to include `"Comments"`:

```ts
  sections?: Partial<Record<
    "User Story" | "Description" | "What To Do" | "What Is Done" | "How To Test" | "Technical Summary" | "Comments",
    string
  >>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/task-update.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/store/tasks.ts tests/task-update.test.ts
git commit -m "feat: task update with DoD guard and comments"
```

---

## Phase 5 — Dependency DAG

### Task 11: Cycle detection and next-task selection

**Files:**
- Create: `src/dag.ts`
- Test: `tests/dag.test.ts`

`getNextTask` rule: if any task is `in_progress`, return it (that's "where you are"). Otherwise return the lowest-ID task whose status is `todo` and all `depends_on` are `done`. Returns `null` and a reason when nothing is actionable.

- [ ] **Step 1: Write the failing test**

```ts
// tests/dag.test.ts
import { describe, it, expect } from "vitest";
import { detectCycle, getNextTask } from "../src/dag.js";
import type { TaskFrontmatter, Ticket } from "../src/types.js";

function task(id: string, status: TaskFrontmatter["status"], deps: string[] = []): Ticket<TaskFrontmatter> {
  return {
    frontmatter: { id, title: id, epic: id.split("-")[0], status, depends_on: deps, tags: [], created: "x", updated: "x" },
    sections: {},
    slug: id,
  };
}

describe("detectCycle", () => {
  it("returns null when acyclic", () => {
    expect(detectCycle([task("E1-T1", "todo"), task("E1-T2", "todo", ["E1-T1"])])).toBeNull();
  });
  it("returns the cycle path when cyclic", () => {
    const cycle = detectCycle([
      task("E1-T1", "todo", ["E1-T2"]),
      task("E1-T2", "todo", ["E1-T1"]),
    ]);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBeGreaterThan(0);
  });
});

describe("getNextTask", () => {
  it("returns an in_progress task first", () => {
    const r = getNextTask([task("E1-T1", "todo"), task("E1-T2", "in_progress")]);
    expect(r.task?.frontmatter.id).toBe("E1-T2");
    expect(r.reason).toMatch(/in progress/i);
  });

  it("returns the lowest-id unblocked todo when none in progress", () => {
    const r = getNextTask([
      task("E1-T1", "done"),
      task("E1-T2", "todo", ["E1-T1"]),
      task("E1-T3", "todo", ["E1-T2"]),
    ]);
    expect(r.task?.frontmatter.id).toBe("E1-T2");
  });

  it("skips todo tasks whose dependencies are not done", () => {
    const r = getNextTask([
      task("E1-T1", "todo", ["E1-T2"]),
      task("E1-T2", "in_review"),
    ]);
    expect(r.task).toBeNull();
    expect(r.reason).toMatch(/blocked|no actionable/i);
  });

  it("returns null with a reason when everything is done", () => {
    const r = getNextTask([task("E1-T1", "done")]);
    expect(r.task).toBeNull();
    expect(r.reason).toMatch(/done|nothing/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dag.test.ts`
Expected: FAIL — cannot find module `../src/dag.js`.

- [ ] **Step 3: Implement `src/dag.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dag.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/dag.ts tests/dag.test.ts
git commit -m "feat: dependency cycle detection and next-task selection"
```

---

## Phase 6 — Overview generation

### Task 12: Kanban and dependencies renderers

**Files:**
- Create: `src/overview/kanban.ts`
- Create: `src/overview/dependencies.ts`
- Test: `tests/overview-render.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/overview-render.test.ts
import { describe, it, expect } from "vitest";
import { renderKanban } from "../src/overview/kanban.js";
import { renderDependencies } from "../src/overview/dependencies.js";
import type { TaskFrontmatter, EpicFrontmatter, Ticket } from "../src/types.js";

function task(id: string, status: TaskFrontmatter["status"], deps: string[] = []): Ticket<TaskFrontmatter> {
  return {
    frontmatter: { id, title: `Task ${id}`, epic: id.split("-")[0], status, depends_on: deps, tags: [], created: "x", updated: "x" },
    sections: {}, slug: `${id}-x`,
  };
}
function epic(id: string): Ticket<EpicFrontmatter> {
  return { frontmatter: { id, title: `Epic ${id}`, status: "in_progress", goal: "g", created: "x", updated: "x" }, sections: {}, slug: `${id}-x` };
}

describe("renderKanban", () => {
  it("includes the auto-generated banner and a column per status with tasks", () => {
    const md = renderKanban([epic("E1")], [task("E1-T1", "todo"), task("E1-T2", "done")]);
    expect(md).toContain("AUTO-GENERATED");
    expect(md).toContain("Todo");
    expect(md).toContain("Done");
    expect(md).toContain("E1-T1");
    expect(md).toContain("E1-T2");
    // progress summary for the epic (1 of 2 done = 50%)
    expect(md).toMatch(/Epic E1.*50%/s);
  });
});

describe("renderDependencies", () => {
  it("emits a mermaid graph with nodes and dependency edges", () => {
    const md = renderDependencies([task("E1-T1", "done"), task("E1-T2", "todo", ["E1-T1"])]);
    expect(md).toContain("```mermaid");
    expect(md).toContain("graph LR");
    expect(md).toContain("E1-T1"); // human-readable id in the node label
    expect(md).toContain("E1_T1 --> E1_T2"); // edges use sanitized (underscore) node ids
  });

  it("notes when a dependency cycle is present", () => {
    const md = renderDependencies([
      task("E1-T1", "todo", ["E1-T2"]),
      task("E1-T2", "todo", ["E1-T1"]),
    ]);
    expect(md).toMatch(/cycle/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/overview-render.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Implement `src/overview/kanban.ts`**

```ts
import { STATUSES } from "../types.js";
import type { Status, TaskFrontmatter, EpicFrontmatter, Ticket } from "../types.js";

const BANNER = "<!-- AUTO-GENERATED by easyprm — do not edit -->";
const LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  blocked: "Blocked",
  in_review: "In Review",
  done: "Done",
};

export function renderKanban(
  epics: Ticket<EpicFrontmatter>[],
  tasks: Ticket<TaskFrontmatter>[],
): string {
  const byStatus = (s: Status) => tasks.filter((t) => t.frontmatter.status === s);

  const board = STATUSES.map((s) => {
    const items = byStatus(s)
      .map((t) => `- ${t.frontmatter.id} ${t.frontmatter.title}`)
      .join("\n");
    return `### ${LABELS[s]} (${byStatus(s).length})\n\n${items || "_none_"}`;
  }).join("\n\n");

  const summary = epics
    .map((e) => {
      const et = tasks.filter((t) => t.frontmatter.epic === e.frontmatter.id);
      const done = et.filter((t) => t.frontmatter.status === "done").length;
      const pct = et.length ? Math.round((done / et.length) * 100) : 0;
      return `- **Epic ${e.frontmatter.id}** ${e.frontmatter.title}: ${done}/${et.length} done (${pct}%)`;
    })
    .join("\n");

  return `${BANNER}

# Kanban

## Progress by Epic

${summary || "_no epics yet_"}

## Board

${board}
`;
}
```

- [ ] **Step 4: Implement `src/overview/dependencies.ts`**

```ts
import { detectCycle } from "../dag.js";
import type { Status, TaskFrontmatter, Ticket } from "../types.js";

const BANNER = "<!-- AUTO-GENERATED by easyprm — do not edit -->";
const STYLE: Record<Status, string> = {
  backlog: "fill:#eee,stroke:#999",
  todo: "fill:#cce5ff,stroke:#3399ff",
  in_progress: "fill:#fff3cd,stroke:#ffc107",
  blocked: "fill:#f8d7da,stroke:#dc3545",
  in_review: "fill:#e2d9f3,stroke:#6f42c1",
  done: "fill:#d4edda,stroke:#28a745",
};

function nodeId(id: string): string {
  return id.replace(/-/g, "_");
}

export function renderDependencies(tasks: Ticket<TaskFrontmatter>[]): string {
  const lines: string[] = ["graph LR"];
  for (const t of tasks) {
    const n = nodeId(t.frontmatter.id);
    lines.push(`  ${n}["${t.frontmatter.id}: ${t.frontmatter.title}"]`);
    lines.push(`  style ${n} ${STYLE[t.frontmatter.status]}`);
  }
  for (const t of tasks) {
    for (const dep of t.frontmatter.depends_on) {
      lines.push(`  ${nodeId(dep)} --> ${nodeId(t.frontmatter.id)}`);
    }
  }

  const cycle = detectCycle(tasks);
  const note = cycle
    ? `\n> ⚠️ **Dependency cycle detected:** ${cycle.join(" → ")}. Resolve it via update_task.\n`
    : "";

  return `${BANNER}

# Dependencies
${note}
\`\`\`mermaid
${lines.join("\n")}
\`\`\`
`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/overview-render.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/overview/kanban.ts src/overview/dependencies.ts tests/overview-render.test.ts
git commit -m "feat: kanban and dependency-graph renderers"
```

---

### Task 13: Architecture and status renderers

**Files:**
- Create: `src/overview/architecture.ts`
- Create: `src/overview/status.ts`
- Test: `tests/overview-arch-status.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/overview-arch-status.test.ts
import { describe, it, expect } from "vitest";
import { renderArchitecture, parseComponentsBlock } from "../src/overview/architecture.js";
import { renderStatus } from "../src/overview/status.js";
import type { TaskFrontmatter, EpicFrontmatter, Ticket } from "../src/types.js";

const TRF = `# Technical Requirements

\`\`\`easyprm:components
api
db
api -> db
\`\`\`
`;

function task(id: string, status: TaskFrontmatter["status"], deps: string[] = []): Ticket<TaskFrontmatter> {
  return { frontmatter: { id, title: `T ${id}`, epic: id.split("-")[0], status, depends_on: deps, tags: [], created: "x", updated: "x" }, sections: {}, slug: id };
}
function epic(id: string, status: EpicFrontmatter["status"]): Ticket<EpicFrontmatter> {
  return { frontmatter: { id, title: `Epic ${id}`, status, goal: "g", created: "x", updated: "x" }, sections: {}, slug: id };
}

describe("architecture", () => {
  it("parses the components block into nodes and edges", () => {
    const parsed = parseComponentsBlock(TRF);
    expect(parsed.nodes).toEqual(["api", "db"]);
    expect(parsed.edges).toEqual([{ from: "api", to: "db" }]);
  });

  it("renders a mermaid graph, with a hint when the block is missing", () => {
    expect(renderArchitecture(TRF)).toContain("api --> db");
    expect(renderArchitecture("# trf with no block")).toMatch(/no .*components.* block/i);
  });
});

describe("status", () => {
  it("shows active epic, in-progress task, and next recommendation", () => {
    const md = renderStatus(
      [epic("E1", "in_progress")],
      [task("E1-T1", "done"), task("E1-T2", "in_progress"), task("E1-T3", "todo", ["E1-T2"])],
    );
    expect(md).toContain("AUTO-GENERATED");
    expect(md).toContain("E1-T2"); // in progress
    expect(md).toMatch(/Next|Recommended/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/overview-arch-status.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Implement `src/overview/architecture.ts`**

```ts
const BANNER = "<!-- AUTO-GENERATED by easyprm — do not edit -->";

export interface Components {
  nodes: string[];
  edges: { from: string; to: string }[];
}

export function parseComponentsBlock(trf: string): Components | null {
  const m = /```easyprm:components\n([\s\S]*?)```/.exec(trf);
  if (!m) return null;
  const nodes = new Set<string>();
  const edges: { from: string; to: string }[] = [];
  for (const raw of m[1].split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const edge = /^(.+?)\s*->\s*(.+)$/.exec(line);
    if (edge) {
      const from = edge[1].trim();
      const to = edge[2].trim();
      nodes.add(from);
      nodes.add(to);
      edges.push({ from, to });
    } else {
      nodes.add(line);
    }
  }
  return { nodes: [...nodes], edges };
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

export function renderArchitecture(trf: string): string {
  const parsed = parseComponentsBlock(trf);
  if (!parsed) {
    return `${BANNER}

# Architecture

_No \`easyprm:components\` block found in docs/trf.md._ Add a fenced block like:

\`\`\`easyprm:components
api
db
api -> db
\`\`\`
`;
  }
  const lines = ["graph TD"];
  for (const n of parsed.nodes) lines.push(`  ${sanitize(n)}["${n}"]`);
  for (const e of parsed.edges) lines.push(`  ${sanitize(e.from)} --> ${sanitize(e.to)}`);

  return `${BANNER}

# Architecture

\`\`\`mermaid
${lines.join("\n")}
\`\`\`
`;
}
```

- [ ] **Step 4: Implement `src/overview/status.ts`**

```ts
import { getNextTask } from "../dag.js";
import type { TaskFrontmatter, EpicFrontmatter, Ticket } from "../types.js";

const BANNER = "<!-- AUTO-GENERATED by easyprm — do not edit -->";

export function renderStatus(
  epics: Ticket<EpicFrontmatter>[],
  tasks: Ticket<TaskFrontmatter>[],
): string {
  const activeEpic = epics.find((e) => e.frontmatter.status === "in_progress");
  const inProgress = tasks.filter((t) => t.frontmatter.status === "in_progress");
  const blocked = tasks.filter((t) => t.frontmatter.status === "blocked");
  const next = getNextTask(tasks);

  const fmt = (t: Ticket<TaskFrontmatter>) => `${t.frontmatter.id} — ${t.frontmatter.title}`;

  return `${BANNER}

# Status — Where Was I

**Active epic:** ${activeEpic ? `${activeEpic.frontmatter.id} ${activeEpic.frontmatter.title}` : "_none in progress_"}

**In progress:**
${inProgress.length ? inProgress.map((t) => `- ${fmt(t)}`).join("\n") : "_nothing in progress_"}

**Blocked:**
${blocked.length ? blocked.map((t) => `- ${fmt(t)}`).join("\n") : "_none_"}

**Recommended next:** ${next.task ? fmt(next.task) : "—"}
${next.reason}
`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/overview-arch-status.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/overview/architecture.ts src/overview/status.ts tests/overview-arch-status.test.ts
git commit -m "feat: architecture and status renderers"
```

---

### Task 14: regenerateOverview orchestrator + auto-regen on mutation

**Files:**
- Create: `src/overview/index.ts`
- Modify: `src/store/tasks.ts` (call regen after create/update/comment)
- Modify: `src/store/epics.ts` (call regen after create/update)
- Modify: `src/store/docs.ts` (call regen after writeDoc — trf changes architecture)
- Test: `tests/overview-regen.test.ts`

To avoid circular imports, `regenerateOverview` lives in `src/overview/index.ts` and imports from the stores; the stores import `regenerateOverview` lazily via dynamic `import()` inside the call site.

- [ ] **Step 1: Write the failing test**

```ts
// tests/overview-regen.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initProject } from "../src/store/project.js";
import { createEpic } from "../src/store/epics.js";
import { createTask } from "../src/store/tasks.js";

let root: string;
beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-regen-"));
  process.env.EASYPRM_ROOT = root;
  await initProject("App");
});
afterEach(() => {
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

const ov = (f: string) => path.join(root, ".claude/easyprm/overview", f);

describe("auto-regeneration", () => {
  it("writes all four overview files after a task is created", async () => {
    await createEpic({ title: "Auth", goal: "g", description: "d" }, "2026-06-05");
    await createTask({ epic: "E1", title: "Login" }, "2026-06-05");
    for (const f of ["kanban.md", "dependencies.md", "architecture.md", "status.md"]) {
      expect(existsSync(ov(f))).toBe(true);
    }
    expect(readFileSync(ov("kanban.md"), "utf8")).toContain("E1-T1");
    expect(readFileSync(ov("status.md"), "utf8")).toContain("E1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/overview-regen.test.ts`
Expected: FAIL — overview files not generated (no regen wired in).

- [ ] **Step 3: Implement `src/overview/index.ts`**

```ts
import { paths } from "../paths.js";
import { atomicWrite, readFileUtf8, exists } from "../store/fsutil.js";
import { listEpics } from "../store/epics.js";
import { loadAllTasks } from "../store/tasks.js";
import { renderKanban } from "./kanban.js";
import { renderDependencies } from "./dependencies.js";
import { renderArchitecture } from "./architecture.js";
import { renderStatus } from "./status.js";

export async function regenerateOverview(): Promise<string[]> {
  const p = paths();
  const epics = await listEpics();
  const tasks = await loadAllTasks();
  const trf = (await exists(p.docFile("trf.md"))) ? await readFileUtf8(p.docFile("trf.md")) : "";

  const files: Record<string, string> = {
    "kanban.md": renderKanban(epics, tasks),
    "dependencies.md": renderDependencies(tasks),
    "architecture.md": renderArchitecture(trf),
    "status.md": renderStatus(epics, tasks),
  };
  for (const [name, content] of Object.entries(files)) {
    await atomicWrite(p.overviewFile(name), content);
  }
  return Object.keys(files);
}
```

- [ ] **Step 4: Wire auto-regen into the stores**

In `src/store/tasks.ts`, add a helper near the bottom and call it at the end of `createTask`, `updateTask` (and therefore `addComment`):

```ts
async function regen(): Promise<void> {
  const { regenerateOverview } = await import("../overview/index.js");
  await regenerateOverview();
}
```

Before each `return` in `createTask` and `updateTask`, add `await regen();`. (Do not add it in `addComment` separately — it calls `updateTask`.)

In `src/store/epics.ts`, add the same `regen()` helper and `await regen();` before the `return` in `createEpic` and `updateEpic`.

In `src/store/docs.ts`, add the same `regen()` helper and `await regen();` before the `return` in `writeDoc` (so editing `trf.md` refreshes `architecture.md`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/overview-regen.test.ts`
Expected: PASS (1 test). Also run the full suite: `npx vitest run` — all prior tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/overview/index.ts src/store/tasks.ts src/store/epics.ts src/store/docs.ts tests/overview-regen.test.ts
git commit -m "feat: overview orchestrator with auto-regeneration on mutation"
```

---

## Phase 7 — MCP server

### Task 15: Tool registration

**Files:**
- Create: `src/clock.ts`
- Create: `src/tools.ts`
- Test: `tests/tools.test.ts`

`src/clock.ts` centralizes "now" so production uses the real date and tests can verify behavior without asserting on exact dates (tests here only assert structure).

- [ ] **Step 1: Write the failing test**

```ts
// tests/tools.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../src/tools.js";

let root: string;
let client: Client;

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[]).find((c) => c.type === "text")!.text;
  return JSON.parse(text);
}

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-tools-"));
  process.env.EASYPRM_ROOT = root;

  const server = new McpServer({ name: "easyprm", version: "0.1.0" });
  registerTools(server);
  client = new Client({ name: "test", version: "0.0.0" });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientT), server.connect(serverT)]);
});
afterEach(async () => {
  await client.close();
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("MCP tools", () => {
  it("init_project then create_epic + create_task flow returns ok envelopes with next_steps", async () => {
    const init = await call("init_project", { name: "Demo" });
    expect(init.ok).toBe(true);
    expect(init.next_steps).toBeTruthy();

    const epic = await call("create_epic", { title: "Auth", goal: "sign in", description: "flows" });
    expect(epic.ok).toBe(true);
    expect(epic.data.id).toBe("E1");

    const task = await call("create_task", { epic: "E1", title: "Login", whatToDo: "- [ ] form" });
    expect(task.ok).toBe(true);
    expect(task.data.id).toBe("E1-T1");
  });

  it("operating before init returns NOT_INITIALIZED", async () => {
    const res = await call("create_epic", { title: "x", goal: "g", description: "d" });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("NOT_INITIALIZED");
  });

  it("get_next_task returns a recommendation after setup", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    await call("create_task", { epic: "E1", title: "Login" });
    await call("update_task", { id: "E1-T1", status: "todo" });
    const res = await call("get_next_task", {});
    expect(res.ok).toBe(true);
    expect(res.data.task.id).toBe("E1-T1");
  });

  it("update_task → done is blocked when How To Test is unmet", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "g", description: "d" });
    await call("create_task", { epic: "E1", title: "Login", howToTest: "- [ ] unit" });
    const res = await call("update_task", { id: "E1-T1", status: "done" });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("DOD_NOT_MET");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools.test.ts`
Expected: FAIL — cannot find module `../src/tools.js`.

- [ ] **Step 3: Implement `src/clock.ts`**

```ts
/** Returns today's date as YYYY-MM-DD. Centralized so it can be stubbed if needed. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Implement `src/tools.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EasyprmError, ok } from "./errors.js";
import { today } from "./clock.js";
import { initProject, projectExists, readProject } from "./store/project.js";
import { listDocs, readDoc, writeDoc } from "./store/docs.js";
import { createEpic, updateEpic, listEpics, readEpic } from "./store/epics.js";
import { createTask, getTask, listTasks, updateTask, addComment } from "./store/tasks.js";
import { getNextTask } from "./dag.js";
import { loadAllTasks } from "./store/tasks.js";
import { regenerateOverview } from "./overview/index.js";
import { paths } from "./paths.js";
import { readFileUtf8, exists } from "./store/fsutil.js";

type Handler = () => Promise<unknown>;

/** Wrap a handler: convert EasyprmError to its response, JSON-encode, and shape as MCP content. */
async function run(handler: Handler) {
  let payload: unknown;
  try {
    payload = await handler();
  } catch (e) {
    payload =
      e instanceof EasyprmError
        ? e.toResponse()
        : new EasyprmError("FILE_CONFLICT", (e as Error).message).toResponse();
  }
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function requireInit(): void {
  if (!projectExists()) {
    throw new EasyprmError("NOT_INITIALIZED", "easyprm is not initialized in this project.", {
      next_steps: "Call init_project first.",
      recoverable: true,
    });
  }
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "init_project",
    {
      title: "Initialize project",
      description: "Scaffold the .claude/easyprm tree and seed big-picture/sfr/trf docs.",
      inputSchema: { name: z.string().describe("Project name") },
    },
    async ({ name }) =>
      run(async () => {
        const { created } = await initProject(name);
        await regenerateOverview();
        return ok(
          { created },
          "Draft docs/big-picture.md, then docs/sfr.md and docs/trf.md, then create_epic to start decomposing.",
        );
      }),
  );

  server.registerTool(
    "get_status",
    {
      title: "Get status",
      description: "Return 'where was I': active epic, in-progress tasks, blocked, recommended next.",
      inputSchema: {},
    },
    async () =>
      run(async () => {
        requireInit();
        const status = (await exists(paths().overviewFile("status.md")))
          ? await readFileUtf8(paths().overviewFile("status.md"))
          : "(no status yet)";
        const next = getNextTask(await loadAllTasks());
        return ok(
          { status, next: next.task?.frontmatter.id ?? null, reason: next.reason },
          next.task ? `Work on ${next.task.frontmatter.id}.` : next.reason,
        );
      }),
  );

  server.registerTool(
    "list_docs",
    { title: "List docs", description: "List project docs.", inputSchema: {} },
    async () => run(async () => { requireInit(); return ok({ docs: await listDocs() }, "read_doc to view one."); }),
  );

  server.registerTool(
    "read_doc",
    { title: "Read doc", description: "Read a project doc by name.", inputSchema: { name: z.string() } },
    async ({ name }) => run(async () => { requireInit(); return ok({ name, content: await readDoc(name) }, "Edit with write_doc."); }),
  );

  server.registerTool(
    "write_doc",
    {
      title: "Write doc",
      description: "Create or update a project doc (e.g. db.md). Updates architecture if trf.md changes.",
      inputSchema: { name: z.string(), content: z.string() },
    },
    async ({ name, content }) =>
      run(async () => {
        requireInit();
        const written = await writeDoc(name, content);
        return ok({ name: written }, "Overview regenerated. Continue planning or create_epic.");
      }),
  );

  server.registerTool(
    "create_epic",
    {
      title: "Create epic",
      description: "Create an epic. Returns its assigned E# id.",
      inputSchema: {
        title: z.string(),
        goal: z.string(),
        description: z.string(),
        successCriteria: z.string().optional(),
      },
    },
    async (a) =>
      run(async () => {
        requireInit();
        const epic = await createEpic(a, today());
        return ok(
          { id: epic.frontmatter.id, slug: epic.slug },
          `Decompose ${epic.frontmatter.id} into tasks with create_task.`,
        );
      }),
  );

  server.registerTool(
    "update_epic",
    {
      title: "Update epic",
      description: "Update an epic's status/goal/title/description.",
      inputSchema: {
        id: z.string(),
        status: z.enum(["backlog", "todo", "in_progress", "blocked", "in_review", "done"]).optional(),
        goal: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        successCriteria: z.string().optional(),
      },
    },
    async ({ id, ...patch }) =>
      run(async () => { requireInit(); const e = await updateEpic(id, patch, today()); return ok({ id: e.frontmatter.id, status: e.frontmatter.status }, "Overview updated."); }),
  );

  server.registerTool(
    "list_epics",
    { title: "List epics", description: "List all epics with status.", inputSchema: {} },
    async () =>
      run(async () => {
        requireInit();
        const epics = await listEpics();
        return ok(
          { epics: epics.map((e) => ({ id: e.frontmatter.id, title: e.frontmatter.title, status: e.frontmatter.status })) },
          "create_task under an epic, or get_next_task.",
        );
      }),
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Create a task under an epic. Declare depends_on so the DAG and get_next_task work.",
      inputSchema: {
        epic: z.string(),
        title: z.string(),
        userStory: z.string().optional(),
        description: z.string().optional(),
        whatToDo: z.string().optional(),
        howToTest: z.string().optional(),
        technicalSummary: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      },
    },
    async (a) =>
      run(async () => {
        requireInit();
        const t = await createTask(a, today());
        const hint = (a.dependsOn?.length ?? 0) === 0
          ? "Tip: set dependsOn so get_next_task can order work. Move to 'todo' when ready."
          : "Move to 'todo' when ready to schedule it.";
        return ok({ id: t.frontmatter.id, slug: t.slug }, hint);
      }),
  );

  server.registerTool(
    "get_task",
    { title: "Get task", description: "Read a full task by id.", inputSchema: { id: z.string() } },
    async ({ id }) =>
      run(async () => {
        requireInit();
        const t = await getTask(id);
        return ok({ frontmatter: t.frontmatter, sections: t.sections }, "update_task to change it.");
      }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List tasks, optionally filtered by epic/status/tag.",
      inputSchema: { epic: z.string().optional(), status: z.string().optional(), tag: z.string().optional() },
    },
    async (f) =>
      run(async () => {
        requireInit();
        const tasks = await listTasks(f);
        return ok(
          { tasks: tasks.map((t) => ({ id: t.frontmatter.id, title: t.frontmatter.title, status: t.frontmatter.status, depends_on: t.frontmatter.depends_on })) },
          "get_next_task for what to do now.",
        );
      }),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description: "Update a task's status, title, deps, tags, or sections. Blocks → done until How To Test boxes are checked.",
      inputSchema: {
        id: z.string(),
        status: z.enum(["backlog", "todo", "in_progress", "blocked", "in_review", "done"]).optional(),
        title: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        sections: z.record(z.string()).optional(),
      },
    },
    async ({ id, sections, ...rest }) =>
      run(async () => {
        requireInit();
        const t = await updateTask(id, { ...rest, sections: sections as never }, today());
        return ok({ id: t.frontmatter.id, status: t.frontmatter.status }, "Overview updated. get_next_task for what's next.");
      }),
  );

  server.registerTool(
    "get_next_task",
    {
      title: "Get next task",
      description: "Return the single recommended next task given dependencies and current status.",
      inputSchema: {},
    },
    async () =>
      run(async () => {
        requireInit();
        const next = getNextTask(await loadAllTasks());
        return ok(
          { task: next.task ? { id: next.task.frontmatter.id, title: next.task.frontmatter.title } : null, reason: next.reason },
          next.task ? `Set ${next.task.frontmatter.id} to in_progress and start.` : next.reason,
        );
      }),
  );

  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description: "Append a timestamped comment to a task.",
      inputSchema: { id: z.string(), author: z.string(), text: z.string() },
    },
    async ({ id, author, text }) =>
      run(async () => { requireInit(); await addComment(id, author, text, today()); return ok({ id }, "Comment added."); }),
  );

  server.registerTool(
    "regenerate_overview",
    {
      title: "Regenerate overview",
      description: "Rebuild kanban/dependencies/architecture/status from tickets (use after manual edits).",
      inputSchema: {},
    },
    async () => run(async () => { requireInit(); const files = await regenerateOverview(); return ok({ regenerated: files }, "Overview is back in sync."); }),
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/tools.test.ts`
Expected: PASS (4 tests). If the SDK's `callTool` content typing differs, the test casts content to a text part — adjust the cast, not the handler.

- [ ] **Step 6: Commit**

```bash
git add src/clock.ts src/tools.ts tests/tools.test.ts
git commit -m "feat: register all easyprm MCP tools"
```

---

### Task 16: Server entry point (stdio)

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Implement `src/index.ts`**

```ts
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

async function main(): Promise<void> {
  const server = new McpServer({ name: "easyprm", version: "0.1.0" });
  registerTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server now runs over stdio until the client disconnects.
}

main().catch((err) => {
  // Never write to stdout — that channel is the MCP transport. Log to stderr.
  console.error("easyprm fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Build and smoke-test the binary**

Run: `npm run build && node dist/index.js < /dev/null`
Expected: process starts, reads EOF from `/dev/null`, exits cleanly (no stack trace on stdout/stderr). A clean exit means the server wired up without throwing.

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: ALL tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: stdio server entry point and npx bin"
```

---

## Phase 8 — Integration & docs

### Task 17: End-to-end integration test

**Files:**
- Create: `tests/integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../src/tools.js";

let root: string;
let client: Client;
async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[]).find((c) => c.type === "text")!.text;
  return JSON.parse(text);
}

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "easyprm-e2e-"));
  process.env.EASYPRM_ROOT = root;
  const server = new McpServer({ name: "easyprm", version: "0.1.0" });
  registerTools(server);
  client = new Client({ name: "t", version: "0" });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(c), server.connect(s)]);
});
afterEach(async () => {
  await client.close();
  delete process.env.EASYPRM_ROOT;
  rmSync(root, { recursive: true, force: true });
});

describe("end-to-end planning + following loop", () => {
  it("plans an epic with two dependent tasks and follows them to done", async () => {
    await call("init_project", { name: "Demo" });
    await call("create_epic", { title: "Auth", goal: "sign in", description: "d" });
    await call("create_task", { epic: "E1", title: "Token store", howToTest: "- [x] unit" });
    await call("create_task", { epic: "E1", title: "Rotation", dependsOn: ["E1-T1"], howToTest: "- [x] unit" });

    // schedule both
    await call("update_task", { id: "E1-T1", status: "todo" });
    await call("update_task", { id: "E1-T2", status: "todo" });

    // next should be T1 (T2 blocked by T1)
    let next = await call("get_next_task", {});
    expect(next.data.task.id).toBe("E1-T1");

    // finish T1
    await call("update_task", { id: "E1-T1", status: "done" });

    // now next is T2
    next = await call("get_next_task", {});
    expect(next.data.task.id).toBe("E1-T2");

    await call("update_task", { id: "E1-T2", status: "done" });

    // kanban shows both done; dependencies graph has the edge
    const ov = (f: string) => path.join(root, ".claude/easyprm/overview", f);
    expect(readFileSync(ov("kanban.md"), "utf8")).toMatch(/Done \(2\)/);
    expect(readFileSync(ov("dependencies.md"), "utf8")).toContain("E1_T1 --> E1_T2");

    // everything done → no next
    next = await call("get_next_task", {});
    expect(next.data.task).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or passes)**

Run: `npx vitest run tests/integration.test.ts`
Expected: PASS if all prior tasks are correct. If it fails, the failure pinpoints an integration gap — fix the implicated module, not the test.

- [ ] **Step 3: Commit**

```bash
git add tests/integration.test.ts
git commit -m "test: end-to-end planning and following loop"
```

---

### Task 18: README and install instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# easyprm

File-based project management MCP server for solo developers building with AI. It owns a `.claude/easyprm/` doc tree, gives you rich tickets, and keeps a kanban board, dependency graph, architecture diagram, and "where was I" status auto-generated from your tickets.

## Install (Claude Code)

```bash
claude mcp add easyprm -- npx -y easyprm
```

Or configure manually in your MCP client:

```json
{
  "mcpServers": {
    "easyprm": { "command": "npx", "args": ["-y", "easyprm"] }
  }
}
```

The server manages files under the current working directory's `.claude/easyprm/`. Set `EASYPRM_ROOT` to target a different project root.

## The loop

1. `init_project` — scaffold the tree.
2. Draft `docs/big-picture.md` → `sfr.md` → `trf.md`.
3. `create_epic` → `create_task` (declare `dependsOn`).
4. `get_status` / `get_next_task` — stay on the plan.
5. `update_task` — track progress; `→ done` requires all "How To Test" boxes checked.

`overview/` files are auto-generated — never edit them by hand.

## Develop

```bash
npm install
npm test
npm run build
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with install and usage"
```

---

## Self-Review

**Spec coverage check (spec § → task):**
- Authored/derived file structure → Tasks 1, 6, 14 (overview is derived & auto-regenerated). ✓
- Extensible docs (open set) → Task 7 (`write_doc` any name). ✓
- Ticket schema (frontmatter + all prose sections) → Tasks 3, 9. All requested fields present: Title, Description, User Story, What To Do, What Is Done, How To Test, Technical Summary, Comments. ✓
- Epic schema (lighter) → Tasks 3, 8. ✓
- Six statuses, `blocked` explicit → Task 2 (`STATUSES`). ✓
- DoD enforcement on `→ done` → Task 10 (`DOD_NOT_MET`). ✓
- Stable IDs (`E#`, `E#-T#`) → Task 5. ✓
- Dependency DAG + `get_next_task` → Task 11. ✓
- Cycle detection → Task 11; surfaced in diagram Task 12. ✓
- Diagrams: kanban (table), dependencies (Mermaid DAG), architecture (Mermaid from `easyprm:components`), status → Tasks 12, 13. ✓
- Auto-regen on mutation → Task 14. ✓
- ~14 tools → Task 15 registers: init_project, get_status, list_docs, read_doc, write_doc, create_epic, update_epic, list_epics, create_task, get_task, list_tasks, update_task, get_next_task, add_comment, regenerate_overview (15). ✓
- Unified error response + error code catalog → Tasks 2, 7, 9, 10, 15 (`requireInit` → NOT_INITIALIZED; catch-all → FILE_CONFLICT). ✓
- Fail-loud / atomic writes → Task 6 (`atomicWrite`). ✓
- Hand-edit tolerance (re-parse from disk, no cache) → all stores read from disk each call; `FILE_CONFLICT` on bad frontmatter (Task 3). ✓
- Testing strategy (unit + integration) → unit tests throughout; integration Task 17. ✓
- Deferred (ADRs, drift detection, companion skill) → correctly NOT implemented. ✓

**Placeholder scan:** No "TBD"/"implement later". Every code step shows complete code; the two ESM-`require`/type-union fixes (Tasks 6, 10) are explicit follow-up steps with exact code. ✓

**Type consistency:** `Ticket<F>` shape (`frontmatter`/`sections`/`slug`), `Status`/`STATUSES`, `TaskFrontmatter`/`EpicFrontmatter`, `EasyprmError`/`ok()`, `getNextTask` returning `{ task, reason }`, `parseCheckboxes` → `{ text, checked }`, `regenerateOverview()` consistent across all tasks. Store function names (`createEpic`, `createTask`, `updateTask`, `addComment`, `loadAllTasks`, `getNextTask`, `detectCycle`, `renderKanban`/`renderDependencies`/`renderArchitecture`/`renderStatus`) match between definition and use. ✓

**Known integration note:** The MCP SDK's exact `registerTool` signature and `callTool` result typing can drift between minor versions. If `npm install` pulls an SDK whose API differs, adjust the registration/transport calls in Tasks 15–16 and the content cast in Tasks 15/17 to match the installed version — the core/store/overview logic is SDK-independent and fully tested without it.
