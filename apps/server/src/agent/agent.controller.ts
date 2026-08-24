import { Controller, Post, Get, Body, Param, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AgentService } from './agent.service';

@Controller('agent/tasks')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post()
  async create(@Body() dto: any, @Req() req) {
    return this.agentService.createTask(req.user?.id || 'demo', dto);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req) {
    return this.agentService.getTask(id, req.user?.id || 'demo');
  }

  @Get(':id/execute')
  execute(
    @Param('id') id: string,
    @Req() req,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = this.agentService.executeTask(id, req.user?.id || 'demo');
    const subscription = stream.subscribe({
      next: (event) => {
        if (event.type === 'approval') return;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    req.on('close', () => subscription.unsubscribe());
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() req) {
    return this.agentService.approveStep(id, req.user?.id || 'demo');
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Req() req) {
    return this.agentService.rejectStep(id, req.user?.id || 'demo');
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req) {
    return this.agentService.cancelTask(id, req.user?.id || 'demo');
  }
}
