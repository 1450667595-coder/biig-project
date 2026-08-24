import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';

@Controller('conversations')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  async list(@Req() req) {
    return this.chatService.listConversations(req.user?.id || 'demo');
  }

  @Post()
  async create(@Body() dto: any, @Req() req) {
    return this.chatService.createConversation(req.user?.id || 'demo', dto);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req) {
    return this.chatService.getConversation(id, req.user?.id || 'demo');
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any, @Req() req) {
    return this.chatService.updateConversation(id, req.user?.id || 'demo', dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    return this.chatService.deleteConversation(id, req.user?.id || 'demo');
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: { content: string; model?: string; mode?: string },
    @Req() req,
    @Res() res: Response,
  ) {
    const userId = req.user?.id || 'demo';
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = this.chatService.streamResponse(
      id,
      dto.content,
      userId,
      { model: dto.model, mode: dto.mode },
    );

    const subscription = stream.subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      },
    });

    req.on('close', () => subscription.unsubscribe());
  }
}
