export type Status =
  | "backlog"
  | "todo"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done";

export const STATUSES: Status[] = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
];

export interface TaskFrontmatter {
  id: string;
  title: string;
  epic: string;
  status: Status;
  depends_on: string[];
  tags: string[];
  created: string;
  updated: string;
}

export interface EpicFrontmatter {
  id: string;
  title: string;
  status: Status;
  goal: string;
  created: string;
  updated: string;
}

export interface Ticket<F> {
  frontmatter: F;
  /** Heading text (without `##`) -> raw body lines as a single string. */
  sections: Record<string, string>;
  /** Folder name on disk, e.g. "E1-auth" or task file stem "E1-T1-login". */
  slug: string;
}

export interface Ok<T> {
  ok: true;
  data: T;
  next_steps: string;
}
