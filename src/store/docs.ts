import { readdir } from "node:fs/promises";
import matter from "gray-matter";
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
  await ensureDocIndexed(normalized);
  await regen();
  return normalized;
}

async function ensureDocIndexed(filename: string): Promise<void> {
  const projectPath = paths().projectFile;
  if (!(await exists(projectPath))) return;
  const raw = await readFileUtf8(projectPath);
  const linkFragment = `docs/${filename}`;
  if (raw.includes(linkFragment)) return;
  const m = matter(raw);
  let body = m.content;
  const displayName = filename.replace(/\.md$/, "");
  const link = `- [${displayName}](${linkFragment})`;
  if (/^##\s+Docs\s*$/m.test(body)) {
    // Insert under existing Docs section (after the last existing - line or right after the heading)
    body = body.replace(/(##\s+Docs\s*\n(?:[^\n]*\n)*?)(\n##|\n*$)/, (_full, group, tail) =>
      `${group}${link}\n${tail}`);
  } else {
    body = body.trimEnd() + `\n\n## Docs\n${link}\n`;
  }
  await atomicWrite(projectPath, matter.stringify(body, m.data));
}

async function regen(): Promise<void> {
  const { regenerateOverview } = await import("../overview/index.js");
  await regenerateOverview();
}
