import { ChatCompletionRequest } from '@biiig/shared';
import { Observable } from 'rxjs';
import { ModelConfig } from './model-config.entity';

export interface ModelStreamEvent {
  type: 'token' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments: string;
  };
  error?: string;
}

export interface CompletionOptions {
  taskType?: 'chat' | 'code' | 'reasoning' | 'multimodal';
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  stream?: boolean;
  preferredProvider?: string;
}

export abstract class IModelProvider {
  abstract readonly name: string;
  abstract complete(
    request: ChatCompletionRequest,
    config: ModelConfig,
  ): Observable<ModelStreamEvent>;
  abstract isAvailable(config: ModelConfig): boolean;
}

export interface RoutedModel {
  config: ModelConfig;
  provider: IModelProvider;
  modelName: string;
}
