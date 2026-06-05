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
    const m = /^\s*-\s+\[( |x|X)\]\s+(.*\S)\s*$/.exec(line);
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
