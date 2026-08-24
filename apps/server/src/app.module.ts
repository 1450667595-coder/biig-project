import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { AgentModule } from './agent/agent.module';
import { ModelModule } from './model/model.module';
import { ProjectsModule } from './projects/projects.module';
import { TemplatesModule } from './templates/templates.module';
import { RepoWikiModule } from './repo-wiki/repo-wiki.module';
import { PluginsModule } from './plugins/plugins.module';
import { User } from './auth/user.entity';
import { Project } from './projects/project.entity';
import { Conversation } from './chat/conversation.entity';
import { Message } from './chat/message.entity';
import { AgentTask } from './agent/agent-task.entity';
import { ModelConfig } from './model/model-config.entity';
import { RepoWikiEntry } from './repo-wiki/repo-wiki-entry.entity';
import { Memory } from './memory/memory.entity';
import { Plugin } from './plugins/plugin.entity';
import { MemoryModule } from './memory/memory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const entities = [
          User,
          Project,
          Conversation,
          Message,
          AgentTask,
          ModelConfig,
          RepoWikiEntry,
        Memory,
        Plugin,
      ];
        if (process.env.DATABASE_URL) {
          return {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities,
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development',
          };
        }
        return {
          type: 'sqljs',
          // 默认写入可写目录，兼容 veFaaS 等只读代码目录的部署环境
          location: process.env.SQLITE_PATH || '/tmp/biiig.sqlite',
          autoSave: true,
          entities,
          synchronize: true,
          logging: process.env.NODE_ENV === 'development',
        };
      },
    }),
    AuthModule,
    ModelModule,
    ChatModule,
    AgentModule,
    ProjectsModule,
    TemplatesModule,
    RepoWikiModule,
    PluginsModule,
    MemoryModule,
  ],
})
export class AppModule {}
