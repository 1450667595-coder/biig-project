import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { spawn } from 'child_process';
import { Plugin } from './plugin.entity';

function shellQuote(arg: string): string {
  if (!/[\s'"\\$|;&<>()`]/.test(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

@Injectable()
export class PluginService {
  constructor(
    @InjectRepository(Plugin)
    private pluginRepo: Repository<Plugin>,
  ) {}

  async findAll(userId: string): Promise<Plugin[]> {
    return this.pluginRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Plugin> {
    const plugin = await this.pluginRepo.findOne({ where: { id, userId } });
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }
    return plugin;
  }

  async create(dto: Partial<Plugin>, userId: string): Promise<Plugin> {
    const plugin = this.pluginRepo.create({
      ...dto,
      userId,
      envVars: dto.envVars || {},
    });
    return this.pluginRepo.save(plugin);
  }

  async update(id: string, dto: Partial<Plugin>, userId: string): Promise<Plugin> {
    const plugin = await this.findOne(id, userId);
    const updated = this.pluginRepo.merge(plugin, dto);
    return this.pluginRepo.save(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.pluginRepo.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Plugin not found');
    }
  }

  async execute(
    command: string,
    args: string[] = [],
    env: Record<string, string> = {},
    userId?: string,
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const plugin = await this.pluginRepo.findOne({
      where: { entryCommand: command, isActive: true, userId },
    });
    if (!plugin) {
      throw new NotFoundException(`Active plugin for command '${command}' not found`);
    }

    const mergedEnv = {
      ...process.env,
      ...plugin.envVars,
      ...env,
    };

    const shellCommand = `${command} ${args.map(shellQuote).join(' ')}`.trim();

    return new Promise((resolve) => {
      const child = spawn(shellCommand, {
        shell: true,
        env: mergedEnv,
        timeout: 60000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout || stderr,
          error: code !== 0 ? `Exit code ${code}. ${stderr}` : undefined,
        });
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message,
        });
      });
    });
  }
}
