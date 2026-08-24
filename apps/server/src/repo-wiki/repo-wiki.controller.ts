import { Controller, Post, Get, Param, Query, Req } from '@nestjs/common';
import { RepoWikiService } from './repo-wiki.service';

@Controller('projects/:id/wiki')
export class RepoWikiController {
  constructor(private repoWikiService: RepoWikiService) {}

  @Post('index')
  async index(@Param('id') projectId: string, @Req() req) {
    return this.repoWikiService.indexProject(projectId, req.user?.id || 'demo');
  }

  @Get('search')
  async search(
    @Param('id') projectId: string,
    @Query('q') query: string,
    @Req() req,
  ) {
    return this.repoWikiService.search(projectId, query, req.user?.id || 'demo');
  }

  @Get()
  async get(@Param('id') projectId: string, @Req() req) {
    return this.repoWikiService.getEntries(projectId, req.user?.id || 'demo');
  }
}
