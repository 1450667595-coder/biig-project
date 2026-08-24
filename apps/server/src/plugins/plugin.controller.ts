import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { PluginService } from './plugin.service';
import { Plugin } from './plugin.entity';

@Controller('plugins')
export class PluginController {
  constructor(private pluginService: PluginService) {}

  private getUserId(req: any): string {
    return req.user?.id || 'demo';
  }

  @Get()
  async list(@Req() req) {
    return this.pluginService.findAll(this.getUserId(req));
  }

  @Post()
  async create(@Body() dto: Partial<Plugin>, @Req() req) {
    return this.pluginService.create(dto, this.getUserId(req));
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req) {
    return this.pluginService.findOne(id, this.getUserId(req));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Plugin>, @Req() req) {
    return this.pluginService.update(id, dto, this.getUserId(req));
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    await this.pluginService.remove(id, this.getUserId(req));
    return { success: true };
  }

  @Post('execute')
  async execute(
    @Body() dto: { command: string; args?: string[]; env?: Record<string, string> },
    @Req() req,
  ) {
    return this.pluginService.execute(
      dto.command,
      dto.args || [],
      dto.env || {},
      this.getUserId(req),
    );
  }
}
