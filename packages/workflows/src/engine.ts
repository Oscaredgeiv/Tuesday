import type { WorkflowDefinition, WorkflowRun } from '@tuesday/shared';
import type { ActionExecutor, ToolContext } from '@tuesday/toolkit';

export class WorkflowEngine {
  constructor(private executor: ActionExecutor) {}

  async run(
    workflow: WorkflowDefinition,
    context: ToolContext,
    variables?: Record<string, string>,
  ): Promise<WorkflowRun> {
    const run: WorkflowRun = {
      id: crypto.randomUUID(),
      workflowId: workflow.id,
      status: 'running',
      currentStepIndex: 0,
      stepResults: [],
      startedAt: new Date().toISOString(),
    };

    const resolvedVars = { ...workflow.variables, ...variables };

    for (let i = 0; i < workflow.steps.length; i++) {
      run.currentStepIndex = i;
      const step = workflow.steps[i];

      // Resolve variable references in input (simple {{var}} replacement)
      const resolvedInput = this.resolveVariables(step.input, resolvedVars);

      const result = await this.executor.execute(step.toolName, resolvedInput, context);

      run.stepResults.push({
        stepId: step.id,
        success: result.success,
        message: result.message,
        data: result.data,
      });

      if (!result.success && !step.continueOnError) {
        run.status = 'failed';
        run.completedAt = new Date().toISOString();
        return run;
      }
    }

    run.status = 'succeeded';
    run.completedAt = new Date().toISOString();
    return run;
  }

  private resolveVariables(
    input: Record<string, unknown>,
    variables: Record<string, string>,
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (_, varName) => variables[varName] ?? '');
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}
