import { paths } from "../paths.js";
import { atomicWrite, readFileUtf8, exists } from "../store/fsutil.js";
import { listEpics } from "../store/epics.js";
import { loadAllTasks } from "../store/tasks.js";
import { listDecisions } from "../store/decisions.js";
import { renderKanban } from "./kanban.js";
import { renderDependencies } from "./dependencies.js";
import { renderArchitecture } from "./architecture.js";
import { renderStatus } from "./status.js";

export async function regenerateOverview(): Promise<string[]> {
  const p = paths();
  const epics = await listEpics();
  const tasks = await loadAllTasks();
  const decisions = await listDecisions();
  const trf = (await exists(p.docFile("trf.md"))) ? await readFileUtf8(p.docFile("trf.md")) : "";

  const files: Record<string, string> = {
    "kanban.md": renderKanban(epics, tasks),
    "dependencies.md": renderDependencies(tasks),
    "architecture.md": renderArchitecture(trf),
    "status.md": renderStatus(epics, tasks, decisions),
  };
  for (const [name, content] of Object.entries(files)) {
    await atomicWrite(p.overviewFile(name), content);
  }
  return Object.keys(files);
}
