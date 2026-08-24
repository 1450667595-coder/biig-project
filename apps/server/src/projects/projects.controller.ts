import { Controller, Get, Post, Put, Body, Param, Delete, Req, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { promises as fs } from 'fs';
import * as path from 'path';

@Controller('projects')
export class ProjectsController {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  @Get()
  async list(@Req() req) {
    return this.projectRepo.find({
      where: { userId: req.user?.id || 'demo' },
      order: { updatedAt: 'DESC' },
    });
  }

  @Post()
  async create(@Body() dto: Partial<Project>, @Req() req) {
    const project = this.projectRepo.create({
      ...dto,
      userId: req.user?.id || 'demo',
    });
    return this.projectRepo.save(project);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req) {
    return this.projectRepo.findOne({
      where: { id, userId: req.user?.id || 'demo' },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<Project>) {
    await this.projectRepo.update(id, dto);
    return this.projectRepo.findOne({ where: { id } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    await this.projectRepo.delete({ id, userId: req.user?.id || 'demo' });
  }

  @Get(':id/files')
  async listFiles(
    @Param('id') id: string,
    @Req() req,
    @Query('path') relativePath = '',
  ) {
    const project = await this.projectRepo.findOne({
      where: { id, userId: req.user?.id || 'demo' },
    });
    if (!project) throw new NotFoundException('Project not found');

    const base = project.localPath || `/tmp/biiig-workspace/${project.name}`;
    const target = path.resolve(base, relativePath);
    if (!target.startsWith(path.resolve(base))) {
      throw new BadRequestException('Invalid path');
    }

    const stats = await fs.stat(target).catch(() => null);
    if (!stats) throw new NotFoundException('Path not found');

    if (stats.isFile()) {
      const content = await fs.readFile(target, 'utf-8');
      return { type: 'file', path: relativePath, content };
    }

    const entries = await fs.readdir(target, { withFileTypes: true });
    const items = entries
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        path: path.posix.join(relativePath, e.name),
      }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));

    return { type: 'directory', path: relativePath, items };
  }

  @Get(':id/files/content')
  async readFile(
    @Param('id') id: string,
    @Req() req,
    @Query('path') relativePath: string,
  ) {
    if (!relativePath) throw new BadRequestException('path is required');
    const project = await this.projectRepo.findOne({
      where: { id, userId: req.user?.id || 'demo' },
    });
    if (!project) throw new NotFoundException('Project not found');

    const base = project.localPath || `/tmp/biiig-workspace/${project.name}`;
    const target = path.resolve(base, relativePath);
    if (!target.startsWith(path.resolve(base))) {
      throw new BadRequestException('Invalid path');
    }

    const stats = await fs.stat(target).catch(() => null);
    if (!stats || !stats.isFile()) throw new NotFoundException('File not found');

    const content = await fs.readFile(target, 'utf-8');
    return { path: relativePath, content };
  }

  @Put(':id/files/content')
  async writeFile(
    @Param('id') id: string,
    @Req() req,
    @Query('path') relativePath: string,
    @Body('content') content: string,
  ) {
    if (!relativePath) throw new BadRequestException('path is required');
    const project = await this.projectRepo.findOne({
      where: { id, userId: req.user?.id || 'demo' },
    });
    if (!project) throw new NotFoundException('Project not found');

    const base = project.localPath || `/tmp/biiig-workspace/${project.name}`;
    const target = path.resolve(base, relativePath);
    if (!target.startsWith(path.resolve(base))) {
      throw new BadRequestException('Invalid path');
    }

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf-8');
    return { path: relativePath };
  }
}
