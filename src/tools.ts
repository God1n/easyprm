import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EasyprmError, ok } from "./errors.js";
import { statusSchema } from "./schema.js";
import { today } from "./clock.js";
import { initProject, projectExists } from "./store/project.js";
import { listDocs, readDoc, writeDoc } from "./store/docs.js";
import { createEpic, updateEpic, listEpics } from "./store/epics.js";
import { createTask, getTask, listTasks, updateTask, addComment, loadAllTasks } from "./store/tasks.js";
import { getNextTask } from "./dag.js";
import { regenerateOverview } from "./overview/index.js";
import { paths } from "./paths.js";
import { readFileUtf8, exists } from "./store/fsutil.js";

type Handler = () => Promise<unknown>;

/** Wrap a handler: convert EasyprmError to its response, JSON-encode, and shape as MCP content. */
async function run(handler: Handler) {
  let payload: unknown;
  try {
    payload = await handler();
  } catch (e) {
    payload =
      e instanceof EasyprmError
        ? e.toResponse()
        : new EasyprmError("INTERNAL_ERROR", `Unexpected error: ${(e as Error).message ?? String(e)}`, {
            recoverable: false,
          }).toResponse();
  }
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function requireInit(): void {
  if (!projectExists()) {
    throw new EasyprmError("NOT_INITIALIZED", "easyprm is not initialized in this project.", {
      next_steps: "Call init_project first.",
      recoverable: true,
    });
  }
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "init_project",
    {
      title: "Initialize project",
      description: "Scaffold the .claude/easyprm tree and seed big-picture/sfr/trf docs.",
      inputSchema: { name: z.string().describe("Project name") },
    },
    async ({ name }) =>
      run(async () => {
        const { created } = await initProject(name);
        await regenerateOverview();
        return ok(
          { created },
          "Draft docs/big-picture.md, then docs/sfr.md and docs/trf.md, then create_epic to start decomposing.",
        );
      }),
  );

  server.registerTool(
    "get_status",
    {
      title: "Get status",
      description: "Return 'where was I': active epic, in-progress tasks, blocked, recommended next.",
      inputSchema: {},
    },
    async () =>
      run(async () => {
        requireInit();
        const status = (await exists(paths().overviewFile("status.md")))
          ? await readFileUtf8(paths().overviewFile("status.md"))
          : "(no status yet)";
        const next = getNextTask(await loadAllTasks());
        return ok(
          { status, next: next.task?.frontmatter.id ?? null, reason: next.reason },
          next.task ? `Work on ${next.task.frontmatter.id}.` : next.reason,
        );
      }),
  );

  server.registerTool(
    "list_docs",
    { title: "List docs", description: "List project docs.", inputSchema: {} },
    async () => run(async () => { requireInit(); return ok({ docs: await listDocs() }, "read_doc to view one."); }),
  );

  server.registerTool(
    "read_doc",
    { title: "Read doc", description: "Read a project doc by name.", inputSchema: { name: z.string() } },
    async ({ name }) => run(async () => { requireInit(); return ok({ name, content: await readDoc(name) }, "Edit with write_doc."); }),
  );

  server.registerTool(
    "write_doc",
    {
      title: "Write doc",
      description: "Create or update a project doc (e.g. db.md). Regenerates all overview files (trf.md changes refresh the architecture diagram).",
      inputSchema: { name: z.string(), content: z.string() },
    },
    async ({ name, content }) =>
      run(async () => {
        requireInit();
        const written = await writeDoc(name, content);
        return ok({ name: written }, "Overview regenerated. Continue planning or create_epic.");
      }),
  );

  server.registerTool(
    "create_epic",
    {
      title: "Create epic",
      description: "Create an epic. Returns its assigned E# id.",
      inputSchema: {
        title: z.string(),
        goal: z.string(),
        description: z.string(),
        successCriteria: z.string().optional(),
      },
    },
    async (a) =>
      run(async () => {
        requireInit();
        const epic = await createEpic(a, today());
        return ok(
          { id: epic.frontmatter.id, slug: epic.slug },
          `Decompose ${epic.frontmatter.id} into tasks with create_task.`,
        );
      }),
  );

  server.registerTool(
    "update_epic",
    {
      title: "Update epic",
      description: "Update an epic's status/goal/title/description.",
      inputSchema: {
        id: z.string(),
        status: statusSchema.optional(),
        goal: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        successCriteria: z.string().optional(),
      },
    },
    async ({ id, ...patch }) =>
      run(async () => { requireInit(); const e = await updateEpic(id, patch, today()); return ok({ id: e.frontmatter.id, status: e.frontmatter.status }, "Overview updated."); }),
  );

  server.registerTool(
    "list_epics",
    { title: "List epics", description: "List all epics with status.", inputSchema: {} },
    async () =>
      run(async () => {
        requireInit();
        const epics = await listEpics();
        return ok(
          { epics: epics.map((e) => ({ id: e.frontmatter.id, title: e.frontmatter.title, status: e.frontmatter.status })) },
          "create_task under an epic, or get_next_task.",
        );
      }),
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Create a task under an epic. Declare depends_on so the DAG and get_next_task work.",
      inputSchema: {
        epic: z.string(),
        title: z.string(),
        userStory: z.string().optional(),
        description: z.string().optional(),
        whatToDo: z.string().optional(),
        howToTest: z.string().optional(),
        technicalSummary: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      },
    },
    async (a) =>
      run(async () => {
        requireInit();
        const t = await createTask(a, today());
        const hint = (a.dependsOn?.length ?? 0) === 0
          ? "Tip: set dependsOn so get_next_task can order work. Move to 'todo' when ready."
          : "Move to 'todo' when ready to schedule it.";
        return ok({ id: t.frontmatter.id, slug: t.slug }, hint);
      }),
  );

  server.registerTool(
    "get_task",
    { title: "Get task", description: "Read a full task by id.", inputSchema: { id: z.string() } },
    async ({ id }) =>
      run(async () => {
        requireInit();
        const t = await getTask(id);
        return ok({ frontmatter: t.frontmatter, sections: t.sections }, "update_task to change it.");
      }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List tasks, optionally filtered by epic/status/tag.",
      inputSchema: { epic: z.string().optional(), status: statusSchema.optional(), tag: z.string().optional() },
    },
    async (f) =>
      run(async () => {
        requireInit();
        const tasks = await listTasks(f);
        return ok(
          { tasks: tasks.map((t) => ({ id: t.frontmatter.id, title: t.frontmatter.title, status: t.frontmatter.status, depends_on: t.frontmatter.depends_on })) },
          "get_next_task for what to do now.",
        );
      }),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description: "Update a task's status, title, deps, tags, or sections. Blocks → done until How To Test boxes are checked.",
      inputSchema: {
        id: z.string(),
        status: statusSchema.optional(),
        title: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        sections: z.record(z.string()).optional().describe(
          "Section bodies to overwrite. Valid keys: User Story | Description | What To Do | What Is Done | How To Test | Technical Summary | Comments. Unknown keys are ignored."
        ),
      },
    },
    async ({ id, sections, ...rest }) =>
      run(async () => {
        requireInit();
        const t = await updateTask(id, { ...rest, sections: sections as never }, today());
        return ok({ id: t.frontmatter.id, status: t.frontmatter.status }, "Overview updated. get_next_task for what's next.");
      }),
  );

  server.registerTool(
    "get_next_task",
    {
      title: "Get next task",
      description: "Return the single recommended next task given dependencies and current status.",
      inputSchema: {},
    },
    async () =>
      run(async () => {
        requireInit();
        const next = getNextTask(await loadAllTasks());
        return ok(
          { task: next.task ? { id: next.task.frontmatter.id, title: next.task.frontmatter.title } : null, reason: next.reason },
          next.task ? `Set ${next.task.frontmatter.id} to in_progress and start.` : next.reason,
        );
      }),
  );

  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description: "Append a timestamped comment to a task.",
      inputSchema: { id: z.string(), author: z.string(), text: z.string() },
    },
    async ({ id, author, text }) =>
      run(async () => { requireInit(); await addComment(id, author, text, today()); return ok({ id }, "Comment added."); }),
  );

  server.registerTool(
    "regenerate_overview",
    {
      title: "Regenerate overview",
      description: "Rebuild kanban/dependencies/architecture/status from tickets (use after manual edits).",
      inputSchema: {},
    },
    async () => run(async () => { requireInit(); const files = await regenerateOverview(); return ok({ regenerated: files }, "Overview is back in sync."); }),
  );
}
