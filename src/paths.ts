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
  decisionsDir: string;
  decisionFile: (fileStem: string) => string;
}

export function paths(): Paths {
  const root = process.env.EASYPRM_ROOT ?? process.cwd();
  const base = path.join(root, ".claude", "easyprm");
  const epics = path.join(base, "epics");
  const decisions = path.join(base, "decisions");
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
    decisionsDir: decisions,
    decisionFile: (stem) => path.join(decisions, `${stem}.md`),
  };
}
