import matter from "gray-matter";
import { readProject, getActivePhase } from "./store/project.js";
import { listPhases } from "./store/phases.js";
import { loadAllTasks } from "./store/tasks.js";
import { listEpics } from "./store/epics.js";
import { listDecisions } from "./store/decisions.js";
import { getNextTask } from "./dag.js";
import { parseCheckboxes } from "./frontmatter.js";
import { effectivePhaseOf } from "./overview/utils.js";

export async function buildBriefing(): Promise<unknown> {
  const projectRaw = await readProject();
  // Extract project name from YAML frontmatter first, fallback to H1
  const parsedProject = matter(projectRaw);
  const fmName = typeof parsedProject.data.name === "string" ? parsedProject.data.name : "";
  const h1Match = projectRaw.match(/^#\s+(.+)$/m);
  const projectName = fmName || (h1Match?.[1]?.trim() ?? "");

  const activePhaseId = await getActivePhase();
  const phases = await listPhases();
  const allTasks = await loadAllTasks();
  const epics = await listEpics();
  const decisions = await listDecisions();
  const activePhase = activePhaseId ? phases.find((p) => p.frontmatter.id === activePhaseId) ?? null : null;

  const epicById = new Map(epics.map((e) => [e.frontmatter.id, e]));
  const scopedTasks = activePhaseId
    ? allTasks.filter((t) => effectivePhaseOf(t, epicById) === activePhaseId)
    : allTasks;

  const inProgress = scopedTasks
    .filter((t) => t.frontmatter.status === "in_progress")
    .map((t) => {
      const remaining = parseCheckboxes(t.sections["What To Do"] ?? "")
        .filter((c) => !c.checked)
        .map((c) => c.text);
      return { id: t.frontmatter.id, title: t.frontmatter.title, what_to_do_remaining: remaining };
    });

  const blocked = scopedTasks
    .filter((t) => t.frontmatter.status === "blocked")
    .map((t) => ({ id: t.frontmatter.id, title: t.frontmatter.title }));

  const next = getNextTask(scopedTasks);

  const recentDecisions = [...decisions]
    .sort((a, b) => b.frontmatter.id.localeCompare(a.frontmatter.id))
    .slice(0, 3)
    .map((d) => ({ id: d.frontmatter.id, title: d.frontmatter.title, date: d.frontmatter.date }));

  // Most recent 5 comments across all tasks; parse `- 2026-06-06 (AI): text` lines
  const recentComments: { task: string; date: string; author: string; text: string }[] = [];
  for (const t of allTasks) {
    const body = t.sections["Comments"] ?? "";
    for (const line of body.split("\n")) {
      const m = /^\s*-\s+(\d{4}-\d{2}-\d{2})\s+\((.+?)\):\s+(.*\S)\s*$/.exec(line);
      if (m) recentComments.push({ task: t.frontmatter.id, date: m[1], author: m[2], text: m[3] });
    }
  }
  recentComments.sort((a, b) => b.date.localeCompare(a.date));

  const phaseProgress = activePhase
    ? {
        done: scopedTasks.filter((t) => t.frontmatter.status === "done").length,
        total: scopedTasks.length,
      }
    : null;

  return {
    project: { name: projectName, active_phase: activePhaseId },
    active_phase: activePhase
      ? {
          id: activePhase.frontmatter.id,
          title: activePhase.frontmatter.title,
          goal: activePhase.frontmatter.goal,
          progress: phaseProgress && phaseProgress.total
            ? { ...phaseProgress, pct: Math.round((phaseProgress.done / phaseProgress.total) * 100) }
            : { done: 0, total: 0, pct: 0 },
        }
      : null,
    in_progress: inProgress,
    blocked,
    next_recommended: next.task
      ? { id: next.task.frontmatter.id, title: next.task.frontmatter.title, reason: next.reason }
      : null,
    recent_decisions: recentDecisions,
    recent_comments: recentComments.slice(0, 5),
  };
}
