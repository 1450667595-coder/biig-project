import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  AgentPlan,
  AgentStep,
  AgentTaskStatus,
  ApprovalMode,
  ChatMessage,
  MessageRole,
  ToolDefinition,
} from '@biiig/shared';
import { Observable, Subject } from 'rxjs';
import { AgentTask } from './agent-task.entity';
import { ModelRouterService } from '../model/model-router.service';
import { RepoWikiService } from '../repo-wiki/repo-wiki.service';
import {
  ExecuteCommandTool,
  ListDirTool,
  MultiEditTool,
  ReadFileTool,
  Tool,
  ToolContext,
  ToolResult,
  WriteFileTool,
} from './tools';
import { AgentAction, parseAction } from './agent-action.util';

@Injectable()
export class AgentService {
  private tools: Map<string, Tool> = new Map();
  private taskStreams: Map<string, Subject<any>> = new Map();

  constructor(
    @InjectRepository(AgentTask)
    private agentTaskRepo: Repository<AgentTask>,
    private modelRouter: ModelRouterService,
    private repoWiki: RepoWikiService,
  ) {
    this.registerTool(new ReadFileTool());
    this.registerTool(new WriteFileTool());
    this.registerTool(new ListDirTool());
    this.registerTool(new ExecuteCommandTool());
    this.registerTool(new MultiEditTool());
  }

  private registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function',
      function: {
        name: t.definition.name,
        description: t.definition.description,
        parameters: t.definition.parameters,
      },
    }));
  }

  private getToolDefinitionsText(): string {
    return Array.from(this.tools.values())
      .map(
        (t) =>
          `- ${t.definition.name}: ${t.definition.description}\n  params: ${JSON.stringify(t.definition.parameters.properties)}`,
      )
      .join('\n');
  }

  async createTask(
    userId: string,
    data: { conversationId: string; description: string; approvalMode?: ApprovalMode; workspacePath?: string; context?: string; projectId?: string },
  ): Promise<AgentTask> {
    const workspacePath = data.workspacePath || '/tmp/biiig-workspace';
    await fs.mkdir(workspacePath, { recursive: true });

    let enrichedContext = data.context || '';
    if (data.projectId) {
      try {
        const wikiContext = await this.repoWiki.buildContext(
          data.projectId,
          data.description,
          userId,
        );
        if (wikiContext) {
          enrichedContext += `\n\n${wikiContext}`;
        }
      } catch {
        // ignore wiki enrichment failures
      }
    }

    const task = this.agentTaskRepo.create({
      userId,
      conversationId: data.conversationId,
      description: data.description,
      approvalMode: data.approvalMode || ApprovalMode.SUGGEST,
      status: AgentTaskStatus.PENDING,
      context: { workspacePath, userContext: enrichedContext, projectId: data.projectId },
    });
    return this.agentTaskRepo.save(task);
  }

  async getTask(id: string, userId: string) {
    const task = await this.agentTaskRepo.findOne({ where: { id, userId } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async approveStep(taskId: string, userId: string) {
    const task = await this.getTask(taskId, userId);
    const stream = this.taskStreams.get(taskId);
    if (!stream) throw new NotFoundException('Task stream not found');
    stream.next({ type: 'approval', approved: true });
    return task;
  }

  async rejectStep(taskId: string, userId: string) {
    const task = await this.getTask(taskId, userId);
    const stream = this.taskStreams.get(taskId);
    if (!stream) throw new NotFoundException('Task stream not found');
    stream.next({ type: 'approval', approved: false });
    return task;
  }

  async cancelTask(taskId: string, userId: string) {
    const task = await this.getTask(taskId, userId);
    task.status = AgentTaskStatus.CANCELLED;
    await this.agentTaskRepo.save(task);
    const stream = this.taskStreams.get(taskId);
    if (stream) {
      stream.next({ type: 'cancelled' });
      stream.complete();
    }
    return task;
  }

  executeTask(taskId: string, userId: string): Observable<any> {
    const subject = new Subject<any>();
    this.taskStreams.set(taskId, subject);

    this.runAgent(taskId, userId, subject).catch((err) => {
      subject.next({ type: 'error', error: err.message || 'Unknown agent error' });
      subject.complete();
      this.taskStreams.delete(taskId);
    });

    return subject.asObservable();
  }

  private async runAgent(taskId: string, userId: string, subject: Subject<any>) {
    const task = await this.getTask(taskId, userId);
    task.status = AgentTaskStatus.RUNNING;
    await this.agentTaskRepo.save(task);

    subject.next({ type: 'status', status: AgentTaskStatus.RUNNING });

    const maxIterations = 25;
    const steps: AgentStep[] = [];
    const history: ChatMessage[] = [];
    const workspacePath = task.context?.workspacePath || '/tmp/biiig-workspace';
    const userContext = task.context?.userContext || '';

    const systemPrompt = this.buildAgentSystemPrompt();
    const userPrompt = this.buildAgentUserPrompt(task.description, userContext, workspacePath);

    subject.next({ type: 'plan', data: { steps } as AgentPlan });

    let stepIndex = 0;
    try {
      for (let i = 0; i < maxIterations; i++) {
        if (await this.isTaskCancelled(taskId)) {
          break;
        }

        task.currentStep = i;
        await this.agentTaskRepo.save(task);

        let response: string;
        try {
          response = await this.callModelWithRetry(
            [
              { role: MessageRole.SYSTEM, content: systemPrompt },
              { role: MessageRole.USER, content: userPrompt },
              ...history,
            ],
            userId,
          );
        } catch (err: any) {
          const errorStep: AgentStep = {
            id: `step-${stepIndex}`,
            description: `模型调用失败：${err.message}`,
            status: AgentTaskStatus.FAILED,
            error: err.message,
          };
          steps.push(errorStep);
          subject.next({ type: 'step_update', stepIndex: stepIndex, step: errorStep });
          break;
        }

        if (!response || !response.trim()) {
          const errorStep: AgentStep = {
            id: `step-${stepIndex}`,
            description: '模型返回空响应',
            status: AgentTaskStatus.FAILED,
            error: 'Empty model response',
          };
          steps.push(errorStep);
          subject.next({ type: 'step_update', stepIndex: stepIndex, step: errorStep });
          break;
        }

        subject.next({ type: 'thinking', stepIndex: i, chunk: response.slice(0, 200) });

        const action = parseAction(response);

        if (action.finalAnswer) {
          const step: AgentStep = {
            id: `step-${stepIndex}`,
            description: action.finalAnswer,
            status: AgentTaskStatus.COMPLETED,
          };
          steps.push(step);
          subject.next({ type: 'step_update', stepIndex: stepIndex, step });
          stepIndex++;
          break;
        }

        const subActions = Array.isArray(action.actions) && action.actions.length > 0
          ? action.actions
          : action.tool
            ? [action]
            : [];

        if (subActions.length === 0) {
          const step: AgentStep = {
            id: `step-${stepIndex}`,
            description: action.thought || response,
            status: AgentTaskStatus.COMPLETED,
          };
          steps.push(step);
          subject.next({ type: 'step_update', stepIndex: stepIndex, step });
          stepIndex++;
          break;
        }

        const batchResults: ToolResult[] = [];
        for (const subAction of subActions) {
          if (await this.isTaskCancelled(taskId)) {
            break;
          }
          const { result } = await this.executeSingleAction(
            subAction,
            task,
            subject,
            stepIndex,
            workspacePath,
          );
          batchResults.push(result);
          stepIndex++;
        }

        history.push(
          { role: MessageRole.ASSISTANT, content: response },
          { role: MessageRole.USER, content: `Tool results: ${JSON.stringify(batchResults)}` },
        );

        const anyFailed = batchResults.some((r) => !r.success);
        if (anyFailed) {
          if (task.approvalMode !== ApprovalMode.FULL_AUTO) {
            break;
          }
          // In full-auto mode, give the model a chance to recover
          history.push({
            role: MessageRole.USER,
            content: 'One or more tool calls failed. Please try a different approach or fix the issue.',
          });
        }
      }
    } catch (err: any) {
      const errorStep: AgentStep = {
        id: `step-error`,
        description: `Agent 执行异常：${err.message}`,
        status: AgentTaskStatus.FAILED,
        error: err.message,
      };
      steps.push(errorStep);
      subject.next({ type: 'step_update', stepIndex: stepIndex, step: errorStep });
    }

    const refreshedTask = await this.getTask(taskId, userId);
    task.plan = { steps };
    task.status = refreshedTask.status === AgentTaskStatus.CANCELLED
      ? AgentTaskStatus.CANCELLED
      : AgentTaskStatus.COMPLETED;
    task.completedAt = new Date();
    await this.agentTaskRepo.save(task);

    subject.next({ type: 'status', status: task.status });
    subject.next({ type: 'done' });
    subject.complete();
    this.taskStreams.delete(taskId);
  }

  private async callModelWithRetry(messages: ChatMessage[], userId: string, retries = 2): Promise<string> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.modelRouter.complete(
          messages,
          { taskType: 'reasoning', temperature: 0.2 },
          userId,
        );
      } catch (err: any) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error('Model call failed after retries');
  }

  private validateToolInput(tool: Tool, input: Record<string, unknown>): { valid: boolean; error?: string } {
    const params = tool.definition.parameters;
    const required = params.required || [];
    for (const key of required) {
      if (input[key] === undefined || input[key] === null || input[key] === '') {
        return { valid: false, error: `Missing required parameter: ${key}` };
      }
    }
    return { valid: true };
  }

  private async isTaskCancelled(taskId: string): Promise<boolean> {
    const task = await this.agentTaskRepo.findOne({ where: { id: taskId } });
    return task?.status === AgentTaskStatus.CANCELLED;
  }

  private buildAgentSystemPrompt(): string {
    return `You are BiiiG, an expert AI software engineer inspired by Codex and TRAE. You operate a sandboxed workspace using tools.

Available tools:
${this.getToolDefinitionsText()}

Workflow (follow this like Codex):
1. Explore: list_dir and read_file to understand the codebase.
2. Plan: decide the minimal changes needed.
3. Execute: read before write; use write_file for code, execute_command for tests/builds.
4. Verify: run commands or read files to confirm the result.

Each turn you must output a single JSON object with exactly one of these shapes:

1. To use a tool:
{
  "thought": "Brief reasoning about what you are doing",
  "tool": "tool_name",
  "toolInput": { ... }
}

2. To batch multiple independent tools in one turn (Codex style):
{
  "thought": "Brief reasoning about the batch",
  "actions": [
    { "tool": "tool_name", "toolInput": { ... } },
    { "tool": "tool_name", "toolInput": { ... } }
  ]
}

3. When you are done:
{
  "thought": "Brief summary",
  "finalAnswer": "Your final response to the user"
}

Rules:
- Always read files before modifying them.
- For file writes, the user must approve changes in suggest mode; still propose the change.
- For multiple small edits to the same or different files, prefer multi_edit.
- Do not ask the user questions; take action.
- Return only valid JSON, no markdown fences.
- If a tool fails, reflect and try a different approach.
- Prefer small, focused edits over rewriting entire files.
- Always run tests or build commands when available to verify changes.`;
  }

  private buildAgentUserPrompt(description: string, context: string, workspacePath: string): string {
    const parts = [
      `Task: ${description}`,
      `Workspace: ${workspacePath}`,
    ];
    if (context) {
      parts.push(`Context:\n${context}`);
    }
    parts.push('Analyze the task, then return the next JSON action.');
    return parts.join('\n\n');
  }

  private async executeTool(
    toolName: string,
    input: Record<string, any>,
    task: AgentTask,
    subject: Subject<any>,
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, output: '', error: `Tool ${toolName} not found` };
    }
    const context: ToolContext = {
      workspacePath: task.context?.workspacePath || '/tmp/biiig-workspace',
      userId: task.userId,
      taskId: task.id,
      onOutput: (chunk) => {
        subject.next({ type: 'step_output', stepIndex: task.currentStep, chunk });
      },
    };
    return tool.execute(input, context);
  }

  private async executeSingleAction(
    action: AgentAction,
    task: AgentTask,
    subject: Subject<any>,
    stepIndex: number,
    workspacePath: string,
  ): Promise<{ step: AgentStep; result: ToolResult }> {
    task.currentStep = stepIndex;

    const step: AgentStep = {
      id: `step-${stepIndex}`,
      description: action.thought || `${action.tool}: ${JSON.stringify(action.toolInput)}`,
      tool: action.tool,
      toolInput: action.toolInput,
      status: AgentTaskStatus.RUNNING,
    };
    subject.next({ type: 'step_update', stepIndex, step });

    const tool = this.tools.get(action.tool || '');
    if (!tool) {
      step.status = AgentTaskStatus.FAILED;
      step.error = `Tool ${action.tool} not found`;
      subject.next({ type: 'step_update', stepIndex, step });
      return { step, result: { success: false, output: '', error: step.error } };
    }

    const validation = this.validateToolInput(tool, action.toolInput || {});
    if (!validation.valid) {
      step.status = AgentTaskStatus.FAILED;
      step.error = validation.error;
      subject.next({ type: 'step_update', stepIndex, step });
      return { step, result: { success: false, output: '', error: validation.error } };
    }

    if (task.approvalMode === ApprovalMode.SUGGEST && this.requiresApproval(action.tool || '')) {
      const diff = await this.buildApprovalDiff(action, workspacePath);
      step.status = AgentTaskStatus.WAITING_APPROVAL;
      subject.next({ type: 'step_update', stepIndex, step, needsApproval: true, diff });
      const approved = await this.waitForApproval(task.id);
      if (await this.isTaskCancelled(task.id) || !approved) {
        step.status = AgentTaskStatus.CANCELLED;
        subject.next({ type: 'step_update', stepIndex, step });
        return { step, result: { success: false, output: '', error: 'Approval rejected or cancelled' } };
      }
      step.status = AgentTaskStatus.RUNNING;
    }

    let result: ToolResult;
    try {
      result = await this.executeTool(action.tool || '', action.toolInput || {}, task, subject);
    } catch (err: any) {
      result = { success: false, output: '', error: err.message || 'Tool execution crashed' };
    }

    step.status = result.success ? AgentTaskStatus.COMPLETED : AgentTaskStatus.FAILED;
    step.result = result.output;
    step.error = result.error;
    subject.next({ type: 'step_update', stepIndex, step, result });

    return { step, result };
  }

  private requiresApproval(toolName: string): boolean {
    return toolName === 'write_file' || toolName === 'multi_edit';
  }

  private async getFileOriginalContent(
    toolInput: Record<string, any>,
    workspacePath: string,
  ): Promise<string | null> {
    if (!toolInput || !toolInput.path) return null;
    const filePath = path.resolve(workspacePath, toolInput.path as string);
    const resolvedWorkspace = path.resolve(workspacePath);
    if (!filePath.startsWith(resolvedWorkspace)) return null;
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private async buildApprovalDiff(action: AgentAction, workspacePath: string): Promise<any> {
    if (action.tool === 'write_file') {
      const original = await this.getFileOriginalContent(action.toolInput || {}, workspacePath);
      return {
        path: (action.toolInput?.path as string) || '',
        original: original || '',
        modified: (action.toolInput?.content as string) || '',
      };
    }

    if (action.tool === 'multi_edit') {
      const edits = (action.toolInput?.edits || []) as Array<{ path: string; search: string; replace: string }>;
      const diffs: Array<{ path: string; original: string; modified: string }> = [];
      for (const edit of edits) {
        const original = await this.getFileOriginalContent({ path: edit.path }, workspacePath);
        diffs.push({
          path: edit.path,
          original: original || '',
          modified: original ? original.replace(edit.search, edit.replace) : '',
        });
      }
      return diffs;
    }

    return null;
  }

  private waitForApproval(taskId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const stream = this.taskStreams.get(taskId);
      if (!stream) {
        resolve(false);
        return;
      }
      const subscription = stream.subscribe({
        next: (event) => {
          if (event.type === 'approval') {
            subscription.unsubscribe();
            resolve(event.approved);
          }
          if (event.type === 'cancelled') {
            subscription.unsubscribe();
            resolve(false);
          }
        },
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        subscription.unsubscribe();
        resolve(false);
      }, 10 * 60 * 1000);
    });
  }
}
