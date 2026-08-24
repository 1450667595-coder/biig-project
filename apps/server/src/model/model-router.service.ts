import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatCompletionRequest, ChatMessage } from '@biiig/shared';
import { Observable } from 'rxjs';
import { ModelConfig } from './model-config.entity';
import { CompletionOptions, IModelProvider, RoutedModel } from './model.types';
import { OpenAICompatibleProvider } from './openai-provider.service';
import { MockModelProvider } from './mock-provider.service';

@Injectable()
export class ModelRouterService {
  private providers: Map<string, IModelProvider> = new Map();

  constructor(
    @InjectRepository(ModelConfig)
    private modelConfigRepo: Repository<ModelConfig>,
    private openaiProvider: OpenAICompatibleProvider,
    private mockProvider: MockModelProvider,
  ) {
    this.providers.set('openai-compatible', openaiProvider);
    this.providers.set('mock', mockProvider);
  }

  async createDefaultConfigs(): Promise<void> {
    const envConfigs = [
      {
        provider: 'deepseek',
        modelName: 'deepseek-chat',
        envKey: 'DEEPSEEK_API_KEY',
        baseUrlEnv: 'DEEPSEEK_BASE_URL',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        priority: 1,
      },
      {
        provider: 'deepseek',
        modelName: 'deepseek-coder',
        envKey: 'DEEPSEEK_API_KEY',
        baseUrlEnv: 'DEEPSEEK_BASE_URL',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        priority: 2,
      },
      {
        provider: 'deepseek',
        modelName: 'deepseek-reasoner',
        envKey: 'DEEPSEEK_API_KEY',
        baseUrlEnv: 'DEEPSEEK_BASE_URL',
        defaultBaseUrl: 'https://api.deepseek.com/v1',
        priority: 3,
      },
      {
        provider: 'doubao',
        modelName: 'doubao-1-5-pro-32k-250115',
        envKey: 'DOUBAO_API_KEY',
        baseUrlEnv: 'DOUBAO_BASE_URL',
        defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        priority: 4,
      },
      {
        provider: 'qwen',
        modelName: 'qwen-coder-plus',
        envKey: 'QWEN_API_KEY',
        baseUrlEnv: 'QWEN_BASE_URL',
        defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        priority: 5,
      },
    ];

    for (const cfg of envConfigs) {
      const apiKey = process.env[cfg.envKey];
      if (!apiKey) continue;

      const exists = await this.modelConfigRepo.findOne({
        where: {
          provider: cfg.provider,
          modelName: cfg.modelName,
          userId: null as any,
        },
      });

      if (!exists) {
        await this.modelConfigRepo.save({
          provider: cfg.provider,
          modelName: cfg.modelName,
          apiKey,
          baseUrl: process.env[cfg.baseUrlEnv] || cfg.defaultBaseUrl,
          priority: cfg.priority,
          capabilities: this.inferCapabilities(cfg.modelName),
          isDefault: cfg.modelName === 'deepseek-chat',
        });
      }
    }
  }

  async healthCheck(): Promise<
    Array<{
      provider: string;
      modelName: string;
      available: boolean;
      ok?: boolean;
      error?: string;
    }>
  > {
    const configs = await this.modelConfigRepo.find({
      where: { userId: null as any },
      order: { priority: 'ASC' },
    });

    return Promise.all(
      configs.map(async (config) => {
        const provider = this.resolveProvider(config);
        if (!provider.isAvailable(config)) {
          return {
            provider: config.provider,
            modelName: config.modelName,
            available: false,
            error: 'Missing API key',
          };
        }

        if (config.provider === 'mock') {
          return {
            provider: config.provider,
            modelName: config.modelName,
            available: true,
            ok: true,
          };
        }

        const result = await this.openaiProvider.checkConnection(config);
        return {
          provider: config.provider,
          modelName: config.modelName,
          available: true,
          ok: result.ok,
          error: result.error,
        };
      }),
    );
  }

  async route(
    options: CompletionOptions,
    userId?: string,
  ): Promise<RoutedModel> {
    const where: any = userId
      ? [{ userId }, { userId: null }]
      : { userId: null };

    const configs = await this.modelConfigRepo.find({
      where,
      order: { priority: 'ASC' },
    });

    if (options.preferredProvider) {
      const [provider, modelName] = options.preferredProvider.split('/');
      const match = configs.find(
        (c) => c.provider === provider && (!modelName || c.modelName === modelName),
      );
      if (match) {
        return {
          config: match,
          provider: this.resolveProvider(match),
          modelName: match.modelName,
        };
      }
    }

    const taskType = options.taskType || 'chat';
    const candidates = configs.filter((c) =>
      c.capabilities?.includes(taskType === 'code' ? 'code' : 'chat'),
    );

    if (candidates.length === 0) {
      const fallbackConfig = {
        id: 'mock',
        provider: 'mock',
        modelName: 'mock-demo',
        apiKey: '',
        baseUrl: '',
        priority: 999,
        capabilities: ['chat', 'code', 'reasoning'],
        isDefault: false,
      } as unknown as ModelConfig;

      return {
        config: fallbackConfig,
        provider: this.mockProvider,
        modelName: fallbackConfig.modelName,
      };
    }

    // Cost-aware routing: prefer cheaper models for simple tasks
    const selected = candidates[0];
    return {
      config: selected,
      provider: this.resolveProvider(selected),
      modelName: selected.modelName,
    };
  }

  async stream(
    messages: ChatMessage[],
    options: CompletionOptions,
    userId?: string,
  ): Promise<Observable<any>> {
    const routed = await this.route(options, userId);
    const request: ChatCompletionRequest = {
      model: routed.modelName,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 4096,
      tools: options.tools,
    };
    return routed.provider.complete(request, routed.config);
  }

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions,
    userId?: string,
  ): Promise<string> {
    const routed = await this.route(options, userId);
    const request: ChatCompletionRequest = {
      model: routed.modelName,
      messages,
      stream: false,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 4096,
      tools: options.tools,
    };
    const result = routed.provider.complete(request, routed.config);
    return new Promise((resolve, reject) => {
      let content = '';
      result.subscribe({
        next: (event) => {
          if (event.type === 'token') content += event.content || '';
          if (event.type === 'error') reject(new Error(event.error || 'Unknown error'));
        },
        complete: () => resolve(content),
        error: reject,
      });
    });
  }

  private resolveProvider(config: ModelConfig): IModelProvider {
    return (
      this.providers.get(config.provider) ||
      this.providers.get('openai-compatible')!
    );
  }

  private inferCapabilities(modelName: string): string[] {
    const caps = ['chat'];
    if (modelName.includes('coder')) caps.push('code');
    if (modelName.includes('reason')) caps.push('reasoning');
    if (modelName.includes('vision') || modelName.includes('vl'))
      caps.push('multimodal');
    if (modelName.includes('32k') || modelName.includes('long'))
      caps.push('long_context');
    return caps;
  }
}
