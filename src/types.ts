export const STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
] as const;

export type Status = (typeof STATUSES)[number];

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

export const DECISION_STATUSES = ["proposed", "accepted", "superseded"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export interface DecisionFrontmatter {
  id: string;             // 4-digit zero-padded, e.g. "0003"
  title: string;
  status: DecisionStatus;
  epic?: string;          // optional, e.g. "E2"
  supersedes?: string;    // optional, another decision id
  date: string;
}
