import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ChatMessage, MessageRole } from '@biiig/shared';
import { RepoWikiEntry } from './repo-wiki-entry.entity';
import { Project } from '../projects/project.entity';
import { ModelRouterService } from '../model/model-router.service';

const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.ts', '.tsx', '.jsx', '.vue', '.py', '.go', '.java',
  '.rb', '.php', '.swift', '.kt', '.rs', '.c', '.cpp', '.h',
  '.md', '.json', '.yaml', '.yml', '.sql', '.css', '.scss',
]);

@Injectable()
export class RepoWikiService {
  constructor(
    @InjectRepository(RepoWikiEntry)
    private repoWikiRepo: Repository<RepoWikiEntry>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private modelRouter: ModelRouterService,
  ) {}

  async indexProject(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId, userId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const workspacePath = project.localPath || `/tmp/biiig-workspace/${projectId}`;
    project.repoWikiStatus = 'indexing';
    await this.projectRepo.save(project);

    await this.repoWikiRepo.update(
      { projectId },
      { summary: 'stale' },
    );

    const files = await this.listSourceFiles(workspacePath);
    const entries: RepoWikiEntry[] = [];

    for (const filePath of files.slice(0, 1000)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const relativePath = path.relative(workspacePath, filePath);

        const existing = await this.repoWikiRepo.findOne({
          where: { projectId, filePath: relativePath },
        });
        if (existing && existing.fileHash === hash) {
          entries.push(existing);
          continue;
        }

        const summary = await this.summarizeFile(relativePath, content, userId);
        const symbols = this.extractSymbols(content, path.extname(filePath));

        const entry = existing
          ? { ...existing, fileHash: hash, summary, symbols }
          : this.repoWikiRepo.create({
              projectId,
              filePath: relativePath,
              fileHash: hash,
              summary,
              symbols,
            });

        entries.push(await this.repoWikiRepo.save(entry));
      } catch (err) {
        console.error(`Failed to index ${filePath}:`, err.message);
      }
    }

    project.repoWikiStatus = 'ready';
    await this.projectRepo.save(project);

    return {
      indexedCount: entries.length,
      files: entries.map((e) => ({ path: e.filePath, summary: e.summary })),
    };
  }

  async search(projectId: string, query: string, userId: string) {
    const entries = await this.repoWikiRepo.find({ where: { projectId } });

    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    const scored = entries.map((entry) => {
      const text = `${entry.filePath} ${entry.summary} ${JSON.stringify(entry.symbols)}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (entry.filePath.toLowerCase().includes(term)) score += 3;
        if (entry.summary.toLowerCase().includes(term)) score += 2;
        if (text.includes(term)) score += 1;
      }
      return { entry, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s) => ({
        filePath: s.entry.filePath,
        summary: s.entry.summary,
        symbols: s.entry.symbols,
      }));
  }

  async buildContext(projectId: string, query: string, userId: string): Promise<string> {
    const results = await this.search(projectId, query, userId);
    if (results.length === 0) return '';
    const lines = ['Relevant project files:'];
    for (const r of results.slice(0, 5)) {
      lines.push(`- ${r.filePath}: ${r.summary}`);
      if (r.symbols && r.symbols.length > 0) {
        const names = r.symbols.slice(0, 5).map((s: any) => s.name).filter(Boolean);
        if (names.length) lines.push(`  symbols: ${names.join(', ')}`);
      }
    }
    return lines.join('\n');
  }

  async getEntries(projectId: string, userId: string) {
    return this.repoWikiRepo.find({
      where: { projectId },
      order: { filePath: 'ASC' },
    });
  }

  private async listSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === 'dist' ||
            entry.name === '.next'
          ) {
            continue;
          }
          files.push(...(await this.listSourceFiles(fullPath)));
        } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory may not exist
    }
    return files;
  }

  private async summarizeFile(filePath: string, content: string, userId: string): Promise<string> {
    const truncated = content.slice(0, 8000);
    const messages: ChatMessage[] = [
      {
        role: MessageRole.SYSTEM,
        content: 'Summarize this source file in one concise sentence. Mention its main responsibility.',
      },
      {
        role: MessageRole.USER,
        content: `File: ${filePath}\n\n${truncated}`,
      },
    ];
    try {
      return await this.modelRouter.complete(messages, { taskType: 'code', maxTokens: 200 }, userId);
    } catch {
      return `Source file ${filePath}`;
    }
  }

  private extractSymbols(content: string, ext: string): any[] {
    const symbols: any[] = [];
    const lines = content.split('\n');

    if (['.js', '.ts', '.tsx', '.jsx', '.vue'].includes(ext)) {
      const regex = /(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class|interface|const|let|var)\s+(\w+)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const line = content.slice(0, match.index).split('\n').length;
        symbols.push({ name: match[1], kind: 'function', line });
      }
    }

    if (ext === '.py') {
      const regex = /^(?:async\s+)?def\s+(\w+)|^class\s+(\w+)/gm;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const line = content.slice(0, match.index).split('\n').length;
        symbols.push({ name: match[1] || match[2], kind: match[2] ? 'class' : 'function', line });
      }
    }

    return symbols;
  }
}
