import { Injectable } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';
import { ChatCompletionRequest, ChatMessage } from '@biiig/shared';
import { ModelConfig } from './model-config.entity';
import { IModelProvider, ModelStreamEvent } from './model.types';

@Injectable()
export class MockModelProvider extends IModelProvider {
  readonly name = 'mock';

  isAvailable(): boolean {
    return true;
  }

  complete(
    request: ChatCompletionRequest,
    _config: ModelConfig,
  ): Observable<ModelStreamEvent> {
    return new Observable((subscriber: Subscriber<ModelStreamEvent>) => {
      const lastUser = this.findLastUserMessage(request.messages);
      const response = this.mockResponse(request, lastUser);

      const chunks = this.splitResponse(response);
      let i = 0;
      const interval = setInterval(() => {
        if (i < chunks.length) {
          subscriber.next({ type: 'token', content: chunks[i] });
          i++;
        } else {
          clearInterval(interval);
          subscriber.next({ type: 'done' });
          subscriber.complete();
        }
      }, 10);

      return () => clearInterval(interval);
    });
  }

  private findLastUserMessage(messages: ChatMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return typeof messages[i].content === 'string'
          ? (messages[i].content as string)
          : '';
      }
    }
    return '';
  }

  private mockResponse(request: ChatCompletionRequest, userMessage: string): string {
    const systemPrompt = this.findSystemMessage(request.messages);
    const isAgent = systemPrompt.includes('BiiiG, an expert AI software engineer');

    if (isAgent) {
      const turn = (request.messages.filter((m) => m.role === 'assistant').length) || 0;
      if (turn === 0) {
        return JSON.stringify({
          thought: 'List the workspace to understand current state',
          tool: 'list_dir',
          toolInput: { path: '.' },
        });
      }
      if (turn === 1) {
        return JSON.stringify({
          thought: 'Create a sample file as requested',
          tool: 'write_file',
          toolInput: { path: 'hello.txt', content: 'Hello from BiiiG mock model.' },
        });
      }
      return JSON.stringify({
        thought: 'Task complete',
        finalAnswer: '已在工作区创建 hello.txt。当前为模拟模型，配置真实 API Key 后可获得完整能力。',
      });
    }

    if (userMessage.toLowerCase().includes('file') || userMessage.toLowerCase().includes('create')) {
      return '我已收到您的需求，正在规划执行步骤。';
    }

    return '你好！我是 BiiiG 的模拟模型。当前没有配置真实模型 API Key，请在设置中配置 DeepSeek / 豆包 / 通义千问等模型密钥以获得完整能力。';
  }

  private findSystemMessage(messages: ChatMessage[]): string {
    for (const msg of messages) {
      if (msg.role === 'system' && typeof msg.content === 'string') {
        return msg.content;
      }
    }
    return '';
  }

  private splitResponse(response: string): string[] {
    return response.split('');
  }
}
