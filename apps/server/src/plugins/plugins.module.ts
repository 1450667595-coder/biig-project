import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PluginController } from './plugin.controller';
import { PluginService } from './plugin.service';
import { Plugin } from './plugin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plugin])],
  controllers: [PluginController],
  providers: [PluginService],
})
export class PluginsModule {}
