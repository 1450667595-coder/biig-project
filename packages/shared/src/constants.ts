export const APP_NAME = 'BiiiG';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

export enum AgentTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  WAITING_APPROVAL = 'waiting_approval',
}

export enum ApprovalMode {
  SUGGEST = 'suggest',
  AUTO_EDIT = 'auto_edit',
  FULL_AUTO = 'full_auto',
}

export enum ModelProvider {
  DEEPSEEK = 'deepseek',
  DOUBAO = 'doubao',
  QWEN = 'qwen',
  ZHIPU = 'zhipu',
  KIMI = 'kimi',
  OPENAI = 'openai',
}

export enum ConversationMode {
  CHAT = 'chat',
  AGENT = 'agent',
  BUILDER = 'builder',
}

export enum MemoryType {
  PREFERENCE = 'preference',
  DECISION = 'decision',
  CONTEXT = 'context',
}
