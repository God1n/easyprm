import path from "node:path";
import { paths } from "../paths.js";
import { atomicWrite, readFileUtf8, exists } from "../store/fsutil.js";
import { listEpics } from "../store/epics.js";
import { loadAllTasks } from "../store/tasks.js";
import { listDecisions } from "../store/decisions.js";
import { listPhases } from "../store/phases.js";
import { getActivePhase } from "../store/project.js";
import { renderKanban } from "./kanban.js";
import { renderDependencies } from "./dependencies.js";
import { renderArchitecture } from "./architecture.js";
import { renderStatus } from "./status.js";
import { renderPhases } from "./phases.js";

export async function regenerateOverview(): Promise<string[]> {
  const p = paths();
  const epics = await listEpics();
  const tasks = await loadAllTasks();
  const decisions = await listDecisions();
  const phases = await listPhases();
  const activePhaseId = await getActivePhase();
  const trf = (await exists(p.docFile("trf.md"))) ? await readFileUtf8(p.docFile("trf.md")) : "";

  const activePhaseInfo = activePhaseId
    ? phases.find((ph) => ph.frontmatter.id === activePhaseId) ?? null
    : null;
  const activePhaseForStatus = activePhaseInfo
    ? { id: activePhaseInfo.frontmatter.id, title: activePhaseInfo.frontmatter.title }
    : null;
  const allPhasesShort = phases.map((ph) => ({ id: ph.frontmatter.id, title: ph.frontmatter.title }));

  const files: Record<string, string> = {
    "kanban.md": renderKanban(epics, tasks, activePhaseId, allPhasesShort),
    "dependencies.md": renderDependencies(tasks, epics),
    "architecture.md": renderArchitecture(trf),
    "status.md": renderStatus(epics, tasks, decisions, activePhaseForStatus),
  };
  for (const [name, content] of Object.entries(files)) {
    await atomicWrite(p.overviewFile(name), content);
  }
  // Write phases.md at project base (.claude/easyprm/phases.md)
  await atomicWrite(path.join(p.base, "phases.md"), renderPhases(phases, epics, tasks));
  return [...Object.keys(files), "phases.md"];
}
