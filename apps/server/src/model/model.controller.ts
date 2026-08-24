import { Controller, Get, Post, Body, Put, Param, Req, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelConfig } from './model-config.entity';
import { ModelRouterService } from './model-router.service';

@Controller('models')
export class ModelController {
  constructor(
    @InjectRepository(ModelConfig)
    private modelConfigRepo: Repository<ModelConfig>,
    private modelRouter: ModelRouterService,
  ) {}

  @Get()
  async list(@Req() req) {
    const userId = req.user?.id;
    const configs = await this.modelConfigRepo.find({
      where: [{ userId }, { userId: null }],
      order: { priority: 'ASC' },
    });
    return configs.map((c) => ({
      id: c.id,
      provider: c.provider,
      modelName: c.modelName,
      isDefault: c.isDefault,
      capabilities: c.capabilities,
      baseUrl: c.baseUrl,
      hasApiKey: !!c.apiKey,
    }));
  }

  private sanitize(config: ModelConfig) {
    return {
      id: config.id,
      provider: config.provider,
      modelName: config.modelName,
      isDefault: config.isDefault,
      capabilities: config.capabilities,
      baseUrl: config.baseUrl,
      hasApiKey: !!config.apiKey,
    };
  }

  @Get('health')
  async health() {
    return this.modelRouter.healthCheck();
  }

  @Post('config')
  async create(@Body() dto: Partial<ModelConfig>, @Req() req) {
    const saved = await this.modelConfigRepo.save({
      ...dto,
      userId: req.user?.id,
    });
    return this.sanitize(saved);
  }

  @Put('config/:id')
  async update(@Param('id') id: string, @Body() dto: Partial<ModelConfig>) {
    await this.modelConfigRepo.update(id, dto);
    const saved = await this.modelConfigRepo.findOne({ where: { id } });
    if (!saved) throw new NotFoundException('Model config not found');
    return this.sanitize(saved);
  }
}
