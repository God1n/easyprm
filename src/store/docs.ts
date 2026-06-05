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
  await regen();
  return normalized;
}

async function regen(): Promise<void> {
  const { regenerateOverview } = await import("../overview/index.js");
  await regenerateOverview();
}
