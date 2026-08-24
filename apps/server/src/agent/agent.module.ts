import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentTask } from './agent-task.entity';
import { ModelModule } from '../model/model.module';
import { RepoWikiModule } from '../repo-wiki/repo-wiki.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentTask]), ModelModule, RepoWikiModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
