import { readdir } from "node:fs/promises";
import { paths } from "./paths.js";
import { EasyprmError } from "./errors.js";

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

/** Next decision id, 4-digit zero-padded (e.g. "0004"). */
export async function nextDecisionId(): Promise<string> {
  const entries = await safeReaddir(paths().decisionsDir);
  let max = 0;
  for (const name of entries) {
    const m = /^(\d{4})-/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return String(max + 1).padStart(4, "0");
}

/** Next task id within an epic, formatted "<epicId>-T<n>". */
export async function nextTaskId(epicFolder: string): Promise<string> {
  const epicId = /^(E\d+)-/.exec(epicFolder)?.[1];
  if (!epicId)
    throw new EasyprmError("VALIDATION_ERROR", `Bad epic folder name: ${epicFolder}`, {
      details: { epicFolder },
      recoverable: false,
      next_steps: "Ensure the epic folder follows the E<n>-<slug> naming convention.",
    });
  const entries = await safeReaddir(paths().tasksDir(epicFolder));
  let max = 0;
  for (const name of entries) {
    const m = new RegExp(`^${epicId}-T(\\d+)-`).exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${epicId}-T${max + 1}`;
}
