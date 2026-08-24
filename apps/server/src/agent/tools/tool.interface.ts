export interface ToolContext {
  workspacePath: string;
  userId: string;
  taskId: string;
  onOutput?: (chunk: string) => void;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface Tool {
  readonly name: string;
  readonly definition: ToolDefinition;
  execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}
