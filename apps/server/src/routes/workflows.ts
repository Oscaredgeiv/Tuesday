import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CreateWorkflowSchema } from '@tuesday/shared';
import { prisma } from '../db.js';
import { WorkflowEngine, BUILTIN_WORKFLOWS } from '@tuesday/workflows';
import { getActionExecutor } from '../setup-tools.js';

export const workflowRouter = Router();

// List all workflows
workflowRouter.get('/', requireAuth, async (_req, res) => {
  const dbWorkflows = await prisma.workflow.findMany({ orderBy: { createdAt: 'desc' } });

  // Merge built-in workflows with db workflows
  const builtinIds = new Set(BUILTIN_WORKFLOWS.map((w) => w.id));
  const dbFiltered = dbWorkflows.filter((w) => !builtinIds.has(w.id));

  const all = [
    ...BUILTIN_WORKFLOWS.map((w) => ({ ...w, source: 'builtin' as const })),
    ...dbFiltered.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      triggerPhrase: w.triggerPhrase,
      steps: w.steps,
      variables: w.variables as Record<string, string> | null,
      enabled: w.enabled,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      source: 'custom' as const,
    })),
  ];

  res.json(all);
});

// Create workflow
workflowRouter.post('/', requireAuth, validate(CreateWorkflowSchema), async (req, res) => {
  const workflow = await prisma.workflow.create({
    data: {
      name: req.body.name,
      description: req.body.description,
      triggerPhrase: req.body.triggerPhrase,
      steps: req.body.steps,
      variables: req.body.variables ?? {},
    },
  });
  res.status(201).json(workflow);
});

// Run a workflow
workflowRouter.post('/:id/run', requireAuth, async (req, res) => {
  // Check built-in first
  let workflowDef = BUILTIN_WORKFLOWS.find((w) => w.id === req.params.id as string);

  if (!workflowDef) {
    const dbWorkflow = await prisma.workflow.findUnique({ where: { id: req.params.id as string } });
    if (!dbWorkflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    workflowDef = {
      id: dbWorkflow.id,
      name: dbWorkflow.name,
      description: dbWorkflow.description ?? undefined,
      triggerPhrase: dbWorkflow.triggerPhrase ?? undefined,
      steps: dbWorkflow.steps as any,
      variables: (dbWorkflow.variables as Record<string, string>) ?? {},
      enabled: dbWorkflow.enabled,
      createdAt: dbWorkflow.createdAt.toISOString(),
      updatedAt: dbWorkflow.updatedAt.toISOString(),
    };
  }

  const engine = new WorkflowEngine(getActionExecutor());
  const run = await engine.run(workflowDef, {
    actionId: `workflow-${workflowDef.id}-${Date.now()}`,
  }, req.body.variables);

  // Persist run
  await prisma.workflowRun.create({
    data: {
      id: run.id,
      workflowId: run.workflowId,
      status: run.status,
      currentStepIndex: run.currentStepIndex,
      stepResults: run.stepResults as object[],
      startedAt: new Date(run.startedAt),
      completedAt: run.completedAt ? new Date(run.completedAt) : null,
    },
  });

  res.json(run);
});

// Delete workflow
workflowRouter.delete('/:id', requireAuth, async (req, res) => {
  await prisma.workflow.delete({ where: { id: req.params.id as string } });
  res.json({ success: true });
});
