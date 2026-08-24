import {
  AgentTaskStatus,
  ApprovalMode,
  ConversationMode,
  MemoryType,
  MessageRole,
  ModelProvider,
} from './constants';

export interface User {
  id: string;
  email: string;
  nickname?: string;
  avatar?: string;
  plan: string;
  credits: number;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  defaultModel: string;
  codingStyle?: string;
  theme?: string;
  approvalMode: ApprovalMode;
  locale: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  localPath: string;
  techStack?: string[];
  framework?: string;
  repoWikiStatus: 'none' | 'indexing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  projectId?: string;
  userId: string;
  title: string;
  model: string;
  mode: ConversationMode;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  tokensUsed?: number;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  output: string;
  status: 'success' | 'error';
}

export interface AgentTask {
  id: string;
  conversationId: string;
  userId: string;
  description: string;
  status: AgentTaskStatus;
  plan?: AgentPlan;
  currentStep: number;
  approvalMode: ApprovalMode;
  createdAt: string;
  completedAt?: string;
}

export interface AgentPlan {
  steps: AgentStep[];
}

export interface AgentStep {
  id: string;
  description: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
  status: AgentTaskStatus;
  result?: string;
  error?: string;
}

export interface ModelConfig {
  id: string;
  userId?: string;
  provider: ModelProvider;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  isDefault?: boolean;
  priority: number;
  capabilities?: ModelCapability[];
  hasApiKey?: boolean;
}

export type ModelCapability =
  | 'chat'
  | 'code'
  | 'reasoning'
  | 'multimodal'
  | 'long_context';

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
}

export interface ChatMessage {
  role: MessageRole;
  content: string | ContentPart[];
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  imageUrl?: { url: string; detail?: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface CodeSnippet {
  id: string;
  name: string;
  description?: string;
  language: string;
  framework?: string;
  code: string;
  tags: string[];
  isPublic: boolean;
  authorId: string;
  usageCount: number;
  createdAt: string;
}

export interface RepoWikiEntry {
  id: string;
  projectId: string;
  filePath: string;
  fileHash: string;
  summary: string;
  symbols: CodeSymbol[];
  embeddingId?: string;
  updatedAt: string;
}

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'module';
  line: number;
  signature?: string;
}

export interface Memory {
  id: string;
  userId: string;
  projectId?: string;
  content: string;
  memoryType: MemoryType;
  importance: number;
  createdAt: string;
  lastAccessedAt?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  framework: string;
  language: string;
  files: TemplateFile[];
  parameters: TemplateParameter[];
}

export interface TemplateFile {
  path: string;
  content: string;
}

export interface TemplateParameter {
  name: string;
  label: string;
  type: 'string' | 'color' | 'boolean' | 'select';
  default?: string;
  options?: string[];
}

export interface SSEEvent {
  type:
    | 'token'
    | 'tool_call'
    | 'tool_result'
    | 'plan'
    | 'step_update'
    | 'error'
    | 'done';
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  status?: string;
  data?: unknown;
}
