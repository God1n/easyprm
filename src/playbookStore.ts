import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { resolveBundleDir } from "./bundleResolver.js";
import { EasyprmError } from "./errors.js";

export interface PlaybookMeta {
  name: string;
  title: string;
  when_to_use: string;
  related: string[];
}

export interface Playbook extends PlaybookMeta {
  content: string;
}

async function readOne(file: string): Promise<Playbook> {
  const raw = await readFile(file, "utf8");
  const m = matter(raw);
  const data = m.data as Partial<PlaybookMeta>;
  return {
    name: data.name ?? path.basename(file, ".md"),
    title: data.title ?? path.basename(file, ".md"),
    when_to_use: data.when_to_use ?? "",
    related: data.related ?? [],
    content: raw,
  };
}

export async function listPlaybooks(): Promise<PlaybookMeta[]> {
  const dir = resolveBundleDir("playbooks");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  const playbooks = await Promise.all(files.map((f) => readOne(path.join(dir, f))));
  return playbooks
    .map(({ name, title, when_to_use, related }) => ({ name, title, when_to_use, related }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPlaybook(name: string): Promise<Playbook> {
  const dir = resolveBundleDir("playbooks");
  const file = path.join(dir, `${name}.md`);
  try {
    return await readOne(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      throw new EasyprmError("PLAYBOOK_NOT_FOUND", `Playbook not found: ${name}`, {
        field: "name",
        next_steps: "Call list_playbooks to see available playbooks.",
      });
    }
    throw e;
  }
}
