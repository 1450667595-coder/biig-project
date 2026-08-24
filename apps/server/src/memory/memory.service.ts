import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from './memory.entity';

@Injectable()
export class MemoryService {
  constructor(
    @InjectRepository(Memory)
    private memoryRepo: Repository<Memory>,
  ) {}

  async remember(
    userId: string,
    content: string,
    type: string,
    projectId?: string,
    importance = 3,
  ) {
    const memory = this.memoryRepo.create({
      userId,
      content,
      memoryType: type,
      projectId,
      importance,
    });
    return this.memoryRepo.save(memory);
  }

  async recall(userId: string, projectId?: string, limit = 10) {
    const query: any = { userId };
    if (projectId) query.projectId = projectId;
    return this.memoryRepo.find({
      where: query,
      order: { importance: 'DESC', lastAccessedAt: 'DESC' },
      take: limit,
    });
  }
}
