import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, MessageRole } from '@biiig/shared';
import { Observable } from 'rxjs';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ModelRouterService } from '../model/model-router.service';
import { MemoryService } from '../memory/memory.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private modelRouter: ModelRouterService,
    private memoryService: MemoryService,
  ) {}

  async listConversations(userId: string) {
    return this.conversationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async createConversation(userId: string, data: Partial<Conversation>) {
    const conversation = this.conversationRepo.create({
      ...data,
      userId,
      title: data.title || 'New Chat',
    });
    return this.conversationRepo.save(conversation);
  }

  async getConversation(id: string, userId: string) {
    return this.conversationRepo.findOne({
      where: { id, userId },
      relations: ['messages'],
    });
  }

  async deleteConversation(id: string, userId: string) {
    await this.conversationRepo.delete({ id, userId });
  }

  async updateConversation(id: string, userId: string, dto: Partial<Conversation>) {
    const conversation = await this.conversationRepo.findOne({ where: { id, userId } });
    if (!conversation) return null;
    await this.conversationRepo.update({ id, userId }, dto);
    return this.conversationRepo.findOne({ where: { id } });
  }

  async buildMessages(conversationId: string, userMessage: string): Promise<ChatMessage[]> {
    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    const chatMessages: ChatMessage[] = [
      {
        role: MessageRole.SYSTEM,
        content: `You are BiiiG, an AI-native IDE assistant. You help users write, understand, and modify code. Always prefer concise, production-ready code. When suggesting file changes, use the tool_call format.`,
      },
    ];

    for (const m of messages) {
      chatMessages.push({ role: m.role as MessageRole, content: m.content });
    }

    chatMessages.push({ role: MessageRole.USER, content: userMessage });
    return chatMessages;
  }

  streamResponse(
    conversationId: string,
    userMessage: string,
    userId: string,
    options?: { mode?: string; model?: string },
  ): Observable<any> {
    return new Observable((subscriber) => {
      let fullContent = '';

      this.buildMessages(conversationId, userMessage)
        .then((messages) =>
          this.modelRouter.stream(messages, {
            taskType: options?.mode === 'code' ? 'code' : 'chat',
            preferredProvider: options?.model,
          }, userId),
        )
        .then((stream) => {
          stream.subscribe({
            next: (event) => {
              if (event.type === 'token') {
                fullContent += event.content || '';
              }
              subscriber.next(event);
            },
            error: (err) => {
              subscriber.next({ type: 'error', error: err.message });
              subscriber.complete();
            },
            complete: () => {
              this.saveMessages(conversationId, userMessage, fullContent);
              subscriber.complete();
            },
          });
        })
        .catch((err) => {
          subscriber.next({ type: 'error', error: err.message });
          subscriber.complete();
        });

      return () => {};
    });
  }

  private async saveMessages(conversationId: string, userContent: string, assistantContent: string) {
    await this.messageRepo.save({
      conversationId,
      role: MessageRole.USER,
      content: userContent,
    });
    await this.messageRepo.save({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: assistantContent,
    });
  }
}
