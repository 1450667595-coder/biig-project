import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ModelModule } from '../model/model.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), ModelModule, MemoryModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
