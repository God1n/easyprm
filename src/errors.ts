import type { Ok } from "./types.js";

export type ErrorCode =
  | "NOT_INITIALIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DEPENDENCY_INVALID"
  | "DEPENDENCY_CYCLE"
  | "DOD_NOT_MET"
  | "ID_CONFLICT"
  | "FILE_CONFLICT"
  | "INTERNAL_ERROR"
  | "PLAYBOOK_NOT_FOUND"
  | "DECISION_NOT_FOUND"
  | "PHASE_NOT_FOUND";

export interface ErrorOpts {
  field?: string;
  details?: unknown;
  recoverable?: boolean;
  next_steps?: string;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
    details?: unknown;
    recoverable: boolean;
    next_steps?: string;
  };
}

export class EasyprmError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public opts: ErrorOpts = {},
  ) {
    super(message);
    this.name = "EasyprmError";
  }

  toResponse(): ErrorResponse {
    const { field, details, recoverable, next_steps } = this.opts;
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        ...(field !== undefined ? { field } : {}),
        ...(details !== undefined ? { details } : {}),
        recoverable: recoverable ?? true,
        ...(next_steps !== undefined ? { next_steps } : {}),
      },
    };
  }
}

export function ok<T>(data: T, next_steps: string): Ok<T> {
  return { ok: true, data, next_steps };
}
