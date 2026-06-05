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
