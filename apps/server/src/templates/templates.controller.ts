import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  async list(@Query('category') category?: string) {
    return this.templatesService.list(category);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.templatesService.get(id);
  }

  @Post(':id/generate')
  async generate(@Param('id') id: string, @Body() dto: { params: Record<string, string>; targetPath: string }) {
    return this.templatesService.generate(id, dto.params, dto.targetPath);
  }
}
