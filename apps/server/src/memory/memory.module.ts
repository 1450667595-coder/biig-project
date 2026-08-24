import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from './memory.entity';
import { MemoryService } from './memory.service';

@Module({
  imports: [TypeOrmModule.forFeature([Memory])],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
