import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepoWikiService } from './repo-wiki.service';
import { RepoWikiController } from './repo-wiki.controller';
import { RepoWikiEntry } from './repo-wiki-entry.entity';
import { Project } from '../projects/project.entity';
import { ModelModule } from '../model/model.module';

@Module({
  imports: [TypeOrmModule.forFeature([RepoWikiEntry, Project]), ModelModule],
  controllers: [RepoWikiController],
  providers: [RepoWikiService],
  exports: [RepoWikiService],
})
export class RepoWikiModule {}
