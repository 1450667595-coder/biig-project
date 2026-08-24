import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable } from 'rxjs';
import { ChatCompletionRequest } from '@biiig/shared';
import { IModelProvider, ModelStreamEvent } from './model.types';
import { ModelConfig } from './model-config.entity';

const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

@Injectable()
export class OpenAICompatibleProvider implements IModelProvider {
  readonly name = 'openai-compatible';

  private getClient(config: ModelConfig): OpenAI {
    return new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseUrl || DEFAULT_BASE_URLS[config.provider],
    });
  }

  async checkConnection(
    config: ModelConfig,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const client = this.getClient(config);
      await client.models.list();
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message || 'Connection failed' };
    }
  }

  isAvailable(config: ModelConfig): boolean {
    return !!(config.apiKey || process.env.OPENAI_API_KEY);
  }

  complete(
    request: ChatCompletionRequest,
    config: ModelConfig,
  ): Observable<ModelStreamEvent> {
    const client = this.getClient(config);
    const modelName = this.mapModelName(config);

    return new Observable((subscriber) => {
      const abortController = new AbortController();

      client.chat.completions
        .create(
          {
            model: modelName,
            messages: request.messages as any,
            stream: true,
            temperature: request.temperature ?? 0.2,
            max_tokens: request.maxTokens ?? 4096,
            tools: request.tools as any,
          },
          { signal: abortController.signal },
        )
        .then(async (stream) => {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              subscriber.next({
                type: 'token',
                content: delta.content,
              });
            }
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                subscriber.next({
                  type: 'tool_call',
                  toolCall: {
                    id: toolCall.id || 'unknown',
                    name: toolCall.function?.name || '',
                    arguments: toolCall.function?.arguments || '',
                  },
                });
              }
            }
          }
          subscriber.next({ type: 'done' });
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.next({
            type: 'error',
            error: error.message || 'Model request failed',
          });
          subscriber.complete();
        });

      return () => abortController.abort();
    });
  }

  private mapModelName(config: ModelConfig): string {
    // Provider-specific model name mapping can be done here
    return config.modelName;
  }
}
