import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelConfig } from './model-config.entity';
import { ModelRouterService } from './model-router.service';
import { OpenAICompatibleProvider } from './openai-provider.service';
import { MockModelProvider } from './mock-provider.service';
import { ModelController } from './model.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ModelConfig])],
  controllers: [ModelController],
  providers: [ModelRouterService, OpenAICompatibleProvider, MockModelProvider],
  exports: [ModelRouterService],
})
export class ModelModule implements OnModuleInit {
  constructor(private router: ModelRouterService) {}

  async onModuleInit() {
    await this.router.createDefaultConfigs();
  }
}
